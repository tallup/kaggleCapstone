import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronRight,
    FolderPlus,
    FolderOpen,
    FileText,
    Loader2,
    Trash2,
    Upload,
    Home,
    ArrowLeft,
    PencilLine,
    Users,
} from 'lucide-react';
import api from '../services/api';
import { useToastContext } from '../contexts/ToastContext';
import { currentUserQueryOptions } from '../queries/currentUser';

function fmtSize(bytes) {
    if (bytes == null) return '';
    const u = ['B', 'KB', 'MB', 'GB'];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
        n /= 1024;
        i += 1;
    }
    return `${Math.round(n * 10) / 10} ${u[i]}`;
}

export default function DocumentLibraryPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToastContext();
    const { data: currentUser } = useQuery(currentUserQueryOptions);

    const [parentId, setParentId] = useState(null);
    const [crumbs, setCrumbs] = useState([{ id: null, title: 'Documents' }]);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [residentSelect, setResidentSelect] = useState('');

    const isAdminViewer =
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'administrator' ||
        currentUser?.role === 'admin';

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data: treeResp, isLoading, isFetching } = useQuery({
        queryKey: ['document-library-tree', parentId, debouncedSearch],
        queryFn: async () => {
            const params = {};
            if (parentId != null) params.parent_id = parentId;
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await api.get('/document-library/tree', { params });
            return res.data?.data ?? { folders: [], files: [] };
        },
        enabled: currentUser != null,
    });

    const { data: residentPickerRows = [] } = useQuery({
        queryKey: ['document-library-residents-picker'],
        queryFn: async () => {
            const r = await api.get('/residents', { params: { per_page: 100, status: 'active' } });
            return Array.isArray(r.data?.data) ? r.data.data : [];
        },
        enabled: isAdminViewer && currentUser != null,
    });

    const folders = treeResp?.folders ?? [];
    const files = treeResp?.files ?? [];

    const openFolder = useCallback((f) => {
        setSearchInput('');
        setParentId(f.id);
        setCrumbs((c) => [...c, { id: f.id, title: f.name }]);
    }, []);

    const crumbTo = useCallback((index) => {
        setSearchInput('');
        const slice = crumbs.slice(0, index + 1);
        setCrumbs(slice);
        const last = slice[slice.length - 1];
        setParentId(last?.id ?? null);
    }, [crumbs]);

    const mkdirMutation = useMutation({
        mutationFn: async ({ name, resident_id: residentId }) => {
            const body = { name };
            if (parentId != null) {
                body.parent_id = parentId;
            }
            if (residentId != null) {
                body.resident_id = residentId;
            }
            const res = await api.post('/document-library/folders', body);
            return res.data;
        },
        onSuccess: (payload) => {
            queryClient.invalidateQueries({ queryKey: ['document-library-tree'] });
            if (payload?.message) {
                showToast(payload.message, 'info');
            } else {
                showToast('Folder created', 'success');
            }
        },
        onError: (e) =>
            showToast(e.response?.data?.message || 'Could not create folder', 'error'),
    });

    const renameFolderMutation = useMutation({
        mutationFn: async ({ id, name }) =>
            api.patch(`/document-library/folders/${id}`, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document-library-tree'] });
            showToast('Folder renamed', 'success');
        },
        onError: (e) =>
            showToast(e.response?.data?.message || 'Could not rename folder', 'error'),
    });

    const rmdirMutation = useMutation({
        mutationFn: async (id) => api.delete(`/document-library/folders/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document-library-tree'] });
            showToast('Folder deleted', 'success');
            crumbTo(0);
        },
        onError: (e) =>
            showToast(e.response?.data?.message || 'Could not delete folder', 'error'),
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ file, folderId }) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder_id', String(folderId));
            return api.post('/document-library/files', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document-library-tree'] });
            showToast('File uploaded', 'success');
        },
        onError: (e) =>
            showToast(e.response?.data?.message || 'Upload failed', 'error'),
    });

    const delFileMutation = useMutation({
        mutationFn: async (id) => api.delete(`/document-library/files/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['document-library-tree'] });
            showToast('File removed', 'success');
        },
        onError: (e) =>
            showToast(e.response?.data?.message || 'Delete failed', 'error'),
    });

    const promptNewFolder = () => {
        const name = window.prompt('Folder name');
        if (!name?.trim()) return;
        mkdirMutation.mutate({ name: name.trim() });
    };

    const promptRenameFolder = (f) => {
        const next = window.prompt('Folder name', f.name ?? '');
        if (!next?.trim() || next.trim() === f.name) return;
        renameFolderMutation.mutate({ id: f.id, name: next.trim() });
    };

    const createResidentRootFolder = (residentId) => {
        const resident = residentPickerRows.find((r) => r.id === residentId);
        const label = resident?.name?.trim() || `Resident #${residentId}`;
        mkdirMutation.mutate({ name: `Documents — ${label}`, resident_id: residentId });
    };

    const canCreateFolder = parentId != null || isAdminViewer;

    const onPickUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || parentId == null) return;
        uploadMutation.mutate({ file, folderId: parentId });
        e.target.value = '';
    };

    const downloadFile = async (id, originalName) => {
        try {
            const res = await api.get(`/document-library/files/${id}/download`, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalName || 'download';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            showToast('Download failed', 'error');
        }
    };

    const currentFolderLabel = useMemo(() => crumbs[crumbs.length - 1]?.title ?? 'Documents', [crumbs]);

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center min-h-[200px] text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-4">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Document library</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Facility documents (admins) and resident documents (care staff). Use folders to organize files.
                </p>
            </div>

            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-600" aria-label="Breadcrumb">
                {crumbs.map((c, i) => (
                    <React.Fragment key={`${c.id}-${i}`}>
                        {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" aria-hidden />}
                        <button
                            type="button"
                            className={`hover:text-[var(--theme-primary)] ${i === crumbs.length - 1 ? 'font-semibold text-gray-900' : ''}`}
                            onClick={() => crumbTo(i)}
                        >
                            {i === 0 ? (
                                <span className="inline-flex items-center gap-1">
                                    <Home className="w-4 h-4" /> Documents
                                </span>
                            ) : (
                                c.title
                            )}
                        </button>
                    </React.Fragment>
                ))}
            </nav>

            <div className="max-w-md">
                <label htmlFor="doc-lib-search" className="sr-only">
                    Search in this folder
                </label>
                <input
                    id="doc-lib-search"
                    type="search"
                    autoComplete="off"
                    placeholder="Search folders and files…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--theme-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {crumbs.length > 1 && (
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => crumbTo(crumbs.length - 2)}
                    >
                        <ArrowLeft className="w-4 h-4" /> Up
                    </button>
                )}
                <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    onClick={promptNewFolder}
                    disabled={mkdirMutation.isPending || !canCreateFolder}
                >
                    {mkdirMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                    New folder
                </button>
                {parentId === null && isAdminViewer && residentPickerRows.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-white">
                        <Users className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                        <select
                            className="text-sm bg-transparent border-0 text-gray-900 focus:ring-0 cursor-pointer max-w-[12rem]"
                            aria-label="Open or create resident document folder"
                            value={residentSelect}
                            onChange={(e) => {
                                const v = e.target.value;
                                setResidentSelect('');
                                if (!v) return;
                                createResidentRootFolder(Number(v));
                            }}
                        >
                            <option value="">Resident folder…</option>
                            {residentPickerRows.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {parentId != null && (
                    <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-3 py-2 text-sm font-medium text-[var(--theme-primary)] cursor-pointer hover:bg-[var(--theme-primary)]/15">
                        <Upload className="w-4 h-4" />
                        Upload file
                        <input type="file" className="hidden" onChange={onPickUpload} />
                    </label>
                )}
            </div>

            {isLoading || isFetching ? (
                <div className="flex items-center gap-2 text-gray-500 py-8">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {folders.map((f) => (
                            <div
                                key={f.id}
                                className="group flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200"
                            >
                                <button
                                    type="button"
                                    className="flex flex-1 text-left gap-3 min-w-0"
                                    onClick={() => openFolder(f)}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                        <FolderOpen className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 truncate">{f.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {f.folders_count} folder(s), {f.files_count} file(s)
                                            {f.is_facility === false && f.resident_id != null ? ' · Resident' : f.is_facility ? ' · Facility' : ''}
                                        </div>
                                    </div>
                                </button>
                                {(isAdminViewer || f.resident_id != null) && (
                                    <>
                                        <button
                                            type="button"
                                            title="Rename folder"
                                            className="shrink-0 p-2 text-gray-400 hover:text-[var(--theme-primary)] opacity-70 group-hover:opacity-100 disabled:opacity-40"
                                            disabled={renameFolderMutation.isPending}
                                            onClick={() => promptRenameFolder(f)}
                                        >
                                            <PencilLine className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Delete folder"
                                            className="shrink-0 p-2 text-gray-400 hover:text-red-600 opacity-70 group-hover:opacity-100"
                                            onClick={() => {
                                                if (window.confirm('Delete this folder and everything inside?')) rmdirMutation.mutate(f.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {files.length > 0 && (
                        <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Files here</div>
                            {files.map((file) => (
                                <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{file.display_name}</div>
                                        <div className="text-xs text-gray-500">{fmtSize(file.size_bytes)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-[var(--theme-primary)]"
                                        onClick={() => downloadFile(file.id, file.original_filename)}
                                    >
                                        Download
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 text-gray-400 hover:text-red-600"
                                        title="Delete"
                                        onClick={() => {
                                            if (window.confirm('Delete this file?')) delFileMutation.mutate(file.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {folders.length === 0 && files.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
                            Nothing in “{currentFolderLabel}”. {parentId ? 'Upload a file or add a subfolder.' : isAdminViewer ? 'Create a facility folder.' : 'Open a resident folder to add documents.'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
