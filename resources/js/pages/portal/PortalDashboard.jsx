import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { format } from 'date-fns';
import {
  FileText,
  Pill,
  Calendar,
  Heart,
  ChevronRight,
  AlertCircle,
  Info,
  Shield,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import PortalPagination, { usePaginationState } from '../../components/portal/PortalPagination';

const PREVIEW_PAGE = 6;

function statusBadge(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  const cls =
    s === 'completed' || s === 'pharmacy_administration_confirm'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : s === 'missed'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : s === 'refused'
          ? 'bg-rose-50 text-rose-800 border-rose-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${cls}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

function incidentWorkflowBadge(status) {
  if (!status) return <span className="text-gray-400">—</span>;
  const s = String(status).toLowerCase();
  const cls =
    s === 'resolved' || s === 'closed'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : s === 'open'
        ? 'bg-sky-50 text-sky-900 border-sky-200'
        : s === 'in_progress'
          ? 'bg-violet-50 text-violet-900 border-violet-200'
          : s === 'on_hold'
            ? 'bg-gray-100 text-gray-700 border-gray-200'
            : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

function severityBadge(sev) {
  if (!sev) return <span className="text-gray-400">—</span>;
  const s = String(sev).toLowerCase();
  const cls =
    s === 'critical'
      ? 'bg-red-50 text-red-900 border-red-200'
      : s === 'high'
        ? 'bg-orange-50 text-orange-900 border-orange-200'
        : s === 'medium'
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {s}
    </span>
  );
}

function importantInfoHasContent(info) {
  if (!info || typeof info !== 'object') return false;
  return Object.values(info).some((v) => v != null && String(v).trim() !== '');
}

export default function PortalDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['family-care-updates'],
    queryFn: async () => {
      const res = await api.get('/family/care-updates');
      return res.data;
    },
  });

  const residents = data?.residents ?? [];
  const linkedIds = data?.linked_resident_ids;
  const tLogs = data?.t_logs ?? [];
  const meds = data?.medication_administrations ?? [];
  const appointments = data?.appointments ?? [];
  const vitals = data?.vitals_summary ?? [];
  const sleepRecords = data?.sleep_records ?? [];
  const sleepPatterns = data?.sleep_patterns ?? [];
  const incidents = data?.incidents ?? [];
  const notLinked = Array.isArray(linkedIds) ? linkedIds.length === 0 : residents.length === 0;

  const notesPag = usePaginationState(tLogs.length, PREVIEW_PAGE);
  const medsPag = usePaginationState(meds.length, PREVIEW_PAGE);
  const apptPag = usePaginationState(appointments.length, PREVIEW_PAGE);
  const vitalsPag = usePaginationState(vitals.length, PREVIEW_PAGE);
  const sleepPag = usePaginationState(sleepRecords.length, PREVIEW_PAGE);
  const patternPag = usePaginationState(sleepPatterns.length, PREVIEW_PAGE);
  const incidentPag = usePaginationState(incidents.length, PREVIEW_PAGE);

  const dietaryNotes = residents.filter((r) => r.dietary_restrictions || r.special_instructions);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-1">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">Recent activity and today&apos;s snapshot.</p>
      </div>

      {notLinked ? (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-950">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">No resident linked to this account yet</p>
            <p className="text-amber-900/90 mt-1">
              Ask your care home to send a family portal invite to your email, or accept the invite link if you already
              received one. Until you are linked, medications and appointments will not appear here.
            </p>
          </div>
        </div>
      ) : dietaryNotes.length > 0 ? (
        <div className="mb-8 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 flex gap-3 text-sm text-sky-950">
          <Info className="w-5 h-5 shrink-0 text-sky-600 mt-0.5" />
          <div className="space-y-2 min-w-0">
            <p className="font-semibold text-sky-900">Care preferences & notes</p>
            {dietaryNotes.map((r) => (
              <div key={r.id} className="text-sky-900/90">
                {residents.length > 1 && <span className="font-medium text-sky-950">{r.name}: </span>}
                {r.dietary_restrictions && (
                  <p>
                    <span className="text-sky-800 font-medium">Diet: </span>
                    {r.dietary_restrictions}
                  </p>
                )}
                {r.special_instructions && (
                  <p className="mt-0.5">
                    <span className="text-sky-800 font-medium">Instructions: </span>
                    {r.special_instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!notLinked &&
        residents.some((r) => importantInfoHasContent(r.important_info)) && (
          <section className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-500" />
                Important health information
              </h2>
              <Link
                to="/portal/care-updates"
                className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-6">
              {residents
                .filter((r) => importantInfoHasContent(r.important_info))
                .map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 text-sm"
                  >
                    {residents.length > 1 && (
                      <p className="font-semibold text-gray-900 mb-3">{r.name}</p>
                    )}
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {r.important_info.allergies && (
                        <>
                          <dt className="text-gray-500 font-medium">Allergies</dt>
                          <dd className="text-gray-900">{r.important_info.allergies}</dd>
                        </>
                      )}
                      {r.important_info.medical_conditions && (
                        <>
                          <dt className="text-gray-500 font-medium">Medical conditions</dt>
                          <dd className="text-gray-900">{r.important_info.medical_conditions}</dd>
                        </>
                      )}
                      {r.important_info.diagnosis && (
                        <>
                          <dt className="text-gray-500 font-medium">Diagnosis</dt>
                          <dd className="text-gray-900 sm:col-span-1">{r.important_info.diagnosis}</dd>
                        </>
                      )}
                      {(r.important_info.physician_name || r.important_info.primary_care_doctor) && (
                        <>
                          <dt className="text-gray-500 font-medium">Care team</dt>
                          <dd className="text-gray-900">
                            {[r.important_info.primary_care_doctor, r.important_info.physician_name]
                              .filter(Boolean)
                              .join(' · ')}
                          </dd>
                        </>
                      )}
                      {r.important_info.mobility_notes && (
                        <>
                          <dt className="text-gray-500 font-medium">Mobility</dt>
                          <dd className="text-gray-900 sm:col-span-1">{r.important_info.mobility_notes}</dd>
                        </>
                      )}
                      {r.important_info.behavioral_notes && (
                        <>
                          <dt className="text-gray-500 font-medium">Behavior</dt>
                          <dd className="text-gray-900 sm:col-span-1">{r.important_info.behavioral_notes}</dd>
                        </>
                      )}
                      {(r.important_info.emergency_contact_name || r.important_info.emergency_contact_phone) && (
                        <>
                          <dt className="text-gray-500 font-medium">Emergency contact</dt>
                          <dd className="text-gray-900">
                            {[r.important_info.emergency_contact_name, r.important_info.emergency_contact_phone]
                              .filter(Boolean)
                              .join(' · ')}
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                ))}
            </div>
          </section>
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Recent care notes
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {tLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent care notes.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {notesPag.slice(tLogs).map((t) => (
                  <li key={t.id} className="py-3 first:pt-0">
                    <time className="text-xs font-medium text-gray-500">
                      {t.reported_on ? format(new Date(t.reported_on), 'MMM d, yyyy · h:mm a') : ''}
                    </time>
                    <p className="text-gray-900 text-sm mt-1 leading-relaxed">{t.summary || '—'}</p>
                    {t.type && <p className="text-xs text-gray-400 mt-1">Type: {t.type}</p>}
                  </li>
                ))}
              </ul>
              <PortalPagination
                page={notesPag.page}
                pageSize={PREVIEW_PAGE}
                total={tLogs.length}
                onPageChange={notesPag.setPage}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-gray-500" />
              Today&apos;s medications
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {meds.length === 0 ? (
            <p className="text-gray-500 text-sm">No medications recorded for today.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {residents.length > 1 && <th className="px-3 py-2">Resident</th>}
                      <th className="px-3 py-2">Medication</th>
                      <th className="px-3 py-2 text-right">Time</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {medsPag.slice(meds).map((m, i) => (
                      <tr key={`${m.resident_id}-${m.administered_at}-${i}`} className="hover:bg-gray-50/80">
                        {residents.length > 1 && (
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {residents.find((x) => x.id === m.resident_id)?.name?.split(' ')[0] ?? '—'}
                          </td>
                        )}
                        <td className="px-3 py-2.5 font-medium text-gray-900">{m.medication_name}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">
                          {m.administered_at ? format(new Date(m.administered_at), 'h:mm a') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">{statusBadge(m.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={medsPag.page}
                pageSize={PREVIEW_PAGE}
                total={meds.length}
                onPageChange={medsPag.setPage}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Upcoming appointments
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {appointments.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming appointments.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {apptPag.slice(appointments).map((a) => (
                  <li key={a.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{a.title || a.appointment_type || 'Appointment'}</p>
                      {a.status && statusBadge(a.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {a.resident_name}
                      <span className="text-gray-500">
                        {' '}
                        · {a.appointment_date}
                        {a.appointment_time ? ` · ${String(a.appointment_time).slice(0, 5)}` : ''}
                      </span>
                    </p>
                    {a.provider_name && <p className="text-xs text-gray-500 mt-1">Provider: {a.provider_name}</p>}
                    {a.location && <p className="text-xs text-gray-500">{a.location}</p>}
                  </li>
                ))}
              </ul>
              <PortalPagination
                page={apptPag.page}
                pageSize={PREVIEW_PAGE}
                total={appointments.length}
                onPageChange={apptPag.setPage}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-gray-500" />
              Recent vitals
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {vitals.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent vitals.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Recorded</th>
                      <th className="px-3 py-2">BP</th>
                      <th className="px-3 py-2">HR</th>
                      <th className="px-3 py-2">Temp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vitalsPag.slice(vitals).map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50/80">
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                          {v.recorded_at ? format(new Date(v.recorded_at), 'MMM d, h:mm a') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800">
                          {v.blood_pressure_systolic != null
                            ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic ?? '—'}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800">{v.heart_rate ?? '—'}</td>
                        <td className="px-3 py-2.5 text-gray-800">{v.temperature ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={vitalsPag.page}
                pageSize={PREVIEW_PAGE}
                total={vitals.length}
                onPageChange={vitalsPag.setPage}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Moon className="w-5 h-5 text-gray-500" />
              Sleep (recent nights)
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {sleepRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">No sleep records in this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Night of</th>
                      <th className="px-3 py-2">Hours</th>
                      <th className="px-3 py-2">Quality</th>
                      <th className="px-3 py-2">Bed / wake</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sleepPag.slice(sleepRecords).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-2.5 text-gray-800 whitespace-nowrap">
                          {s.sleep_date ? format(new Date(s.sleep_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-800">
                          {s.total_sleep_hours != null ? `${s.total_sleep_hours} h` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">{s.sleep_quality_text || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs">
                          {[s.sleep_time, s.wake_time].filter(Boolean).join(' → ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={sleepPag.page}
                pageSize={PREVIEW_PAGE}
                total={sleepRecords.length}
                onPageChange={sleepPag.setPage}
              />
            </>
          )}
          {sleepPatterns.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Monthly patterns</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {patternPag.slice(sleepPatterns).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-sm"
                  >
                    <p className="font-semibold text-gray-900">{p.period}</p>
                    {p.avg_sleep_hours != null && (
                      <p className="text-gray-600 mt-1">Avg sleep: {p.avg_sleep_hours} h / night</p>
                    )}
                    {(p.common_sleep_time || p.common_wake_time) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Typical: {p.common_sleep_time || '—'} → {p.common_wake_time || '—'}
                      </p>
                    )}
                    {p.key_observations && (
                      <p className="text-xs text-gray-600 mt-2">{p.key_observations}</p>
                    )}
                  </div>
                ))}
              </div>
              <PortalPagination
                page={patternPag.page}
                pageSize={PREVIEW_PAGE}
                total={sleepPatterns.length}
                onPageChange={patternPag.setPage}
              />
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Incidents & safety
            </h2>
            <Link
              to="/portal/care-updates"
              className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1 font-medium"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-sm">No incidents recorded in this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {incidentPag.slice(incidents).map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50/80 align-top">
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs">
                          {i.incident_date ? format(new Date(i.incident_date), 'MMM d, yyyy h:mm a') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{i.incident_type || '—'}</td>
                        <td className="px-3 py-2.5">{severityBadge(i.severity)}</td>
                        <td className="px-3 py-2.5">{incidentWorkflowBadge(i.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-2">
                {incidentPag.slice(incidents).map((i) => (
                  <li key={`d-${i.id}`} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                    {i.description && <span className="block text-gray-800">{i.description}</span>}
                    {i.action_taken && (
                      <span className="block text-gray-500 mt-1">Action: {i.action_taken}</span>
                    )}
                  </li>
                ))}
              </ul>
              <PortalPagination
                page={incidentPag.page}
                pageSize={PREVIEW_PAGE}
                total={incidents.length}
                onPageChange={incidentPag.setPage}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
