import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { format } from 'date-fns';
import { FileText, Pill, Calendar, Heart, AlertCircle, Shield, Moon, AlertTriangle } from 'lucide-react';
import PortalPagination from '../../components/portal/PortalPagination';

const PAGE_SIZE = 12;

function paginateSlice(list, page, pageSize) {
  if (!Array.isArray(list)) return [];
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

function statusBadge(status) {
  if (!status) return <span className="text-gray-400">—</span>;
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
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
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

export default function PortalCareUpdates() {
  const [dateFrom, setDateFrom] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['family-care-updates', dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get('/family/care-updates', { params: { date_from: dateFrom, date_to: dateTo } });
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

  const [pageNotes, setPageNotes] = useState(1);
  const [pageMeds, setPageMeds] = useState(1);
  const [pageAppt, setPageAppt] = useState(1);
  const [pageVitals, setPageVitals] = useState(1);
  const [pageSleep, setPageSleep] = useState(1);
  const [pagePattern, setPagePattern] = useState(1);
  const [pageIncident, setPageIncident] = useState(1);

  useEffect(() => {
    setPageNotes(1);
    setPageMeds(1);
    setPageAppt(1);
    setPageVitals(1);
    setPageSleep(1);
    setPagePattern(1);
    setPageIncident(1);
  }, [dateFrom, dateTo]);

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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Care Updates</h1>
        <p className="text-gray-600 mt-1">Care notes, medications, appointments, and vitals for your selected dates.</p>
      </div>

      {notLinked ? (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-950">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">No resident linked to this account</p>
            <p className="text-amber-900/90 mt-1">
              Ask the facility to send a family portal invite, or accept your invite link. Until then, this page will
              stay empty.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4 mb-8 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 pb-2 max-w-md">
          Medications, sleep, incidents, and care notes below use this date range (facility timezone). Vitals remain
          the last 14 days.
        </p>
      </div>

      <div className="space-y-10">
        {!notLinked &&
          residents.some((r) => importantInfoHasContent(r.important_info)) && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-gray-500" />
                Important health information
              </h2>
              <div className="space-y-6">
                {residents
                  .filter((r) => importantInfoHasContent(r.important_info))
                  .map((r) => (
                    <div key={r.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 text-sm">
                      {residents.length > 1 && <p className="font-semibold text-gray-900 mb-3">{r.name}</p>}
                      <dl className="grid gap-3 sm:grid-cols-2">
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
                            <dt className="text-gray-500 font-medium sm:col-span-2">Diagnosis</dt>
                            <dd className="text-gray-900 sm:col-span-2">{r.important_info.diagnosis}</dd>
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
                            <dt className="text-gray-500 font-medium sm:col-span-2">Mobility</dt>
                            <dd className="text-gray-900 sm:col-span-2">{r.important_info.mobility_notes}</dd>
                          </>
                        )}
                        {r.important_info.behavioral_notes && (
                          <>
                            <dt className="text-gray-500 font-medium sm:col-span-2">Behavior</dt>
                            <dd className="text-gray-900 sm:col-span-2">{r.important_info.behavioral_notes}</dd>
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

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-500" />
            Care notes
          </h2>
          {tLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No care notes in this range.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {paginateSlice(tLogs, pageNotes, PAGE_SIZE).map((t) => (
                  <li key={t.id} className="py-4 first:pt-0">
                    <time className="text-xs font-medium text-gray-500">
                      {t.reported_on ? format(new Date(t.reported_on), 'MMM d, yyyy · h:mm a') : ''}
                    </time>
                    <p className="text-gray-900 mt-1 leading-relaxed">{t.summary || '—'}</p>
                    {t.type && <p className="text-xs text-gray-400 mt-1">Type: {t.type}</p>}
                  </li>
                ))}
              </ul>
              <PortalPagination
                page={pageNotes}
                pageSize={PAGE_SIZE}
                total={tLogs.length}
                onPageChange={setPageNotes}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-gray-500" />
            Medication administrations
          </h2>
          {meds.length === 0 ? (
            <p className="text-gray-500 text-sm">None recorded in this range.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {residents.length > 1 && <th className="px-4 py-3">Resident</th>}
                      <th className="px-4 py-3">Medication</th>
                      <th className="px-4 py-3 whitespace-nowrap">Date &amp; time</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginateSlice(meds, pageMeds, PAGE_SIZE).map((m, i) => (
                      <tr key={`${m.resident_id}-${m.administered_at}-${i}`} className="hover:bg-gray-50/80">
                        {residents.length > 1 && (
                          <td className="px-4 py-3 text-gray-700">
                            {residents.find((x) => x.id === m.resident_id)?.name ?? '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-gray-900">{m.medication_name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {m.administered_at ? format(new Date(m.administered_at), 'MMM d, yyyy · h:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">{statusBadge(m.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={pageMeds}
                pageSize={PAGE_SIZE}
                total={meds.length}
                onPageChange={setPageMeds}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            Upcoming appointments
          </h2>
          {appointments.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming appointments.</p>
          ) : (
            <>
              <ul className="space-y-4">
                {paginateSlice(appointments, pageAppt, PAGE_SIZE).map((a) => (
                  <li key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{a.title || a.appointment_type || 'Appointment'}</p>
                      {a.status && statusBadge(a.status)}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">{a.resident_name}</span>
                      <span className="text-gray-500">
                        {' '}
                        · {a.appointment_date}
                        {a.appointment_time ? ` · ${String(a.appointment_time).slice(0, 5)}` : ''}
                      </span>
                    </p>
                    {a.appointment_type && a.title !== a.appointment_type && (
                      <p className="text-xs text-gray-500 mt-1">Type: {a.appointment_type}</p>
                    )}
                    {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}
                    {a.provider_name && <p className="text-xs text-gray-500 mt-2">Provider: {a.provider_name}</p>}
                    {a.location && <p className="text-xs text-gray-500">{a.location}</p>}
                  </li>
                ))}
              </ul>
              <PortalPagination
                page={pageAppt}
                pageSize={PAGE_SIZE}
                total={appointments.length}
                onPageChange={setPageAppt}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-gray-500" />
            Vitals (last 14 days)
          </h2>
          {vitals.length === 0 ? (
            <p className="text-gray-500 text-sm">No vitals in this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Recorded</th>
                      <th className="px-4 py-3">Blood pressure</th>
                      <th className="px-4 py-3">Heart rate</th>
                      <th className="px-4 py-3">Temp</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginateSlice(vitals, pageVitals, PAGE_SIZE).map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {v.recorded_at ? format(new Date(v.recorded_at), 'MMM d, yyyy · h:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {v.blood_pressure_systolic != null
                            ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic ?? '—'}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900">{v.heart_rate ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-900">{v.temperature ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={v.notes || ''}>
                          {v.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={pageVitals}
                pageSize={PAGE_SIZE}
                total={vitals.length}
                onPageChange={setPageVitals}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-gray-500" />
            Daily sleep records
          </h2>
          {sleepRecords.length === 0 ? (
            <p className="text-gray-500 text-sm">No sleep records in this range.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {residents.length > 1 && <th className="px-4 py-3">Resident</th>}
                      <th className="px-4 py-3">Night of</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Quality</th>
                      <th className="px-4 py-3">Bed / wake</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginateSlice(sleepRecords, pageSleep, PAGE_SIZE).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80">
                        {residents.length > 1 && (
                          <td className="px-4 py-3 text-gray-700">
                            {residents.find((x) => x.id === s.resident_id)?.name ?? '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                          {s.sleep_date ? format(new Date(s.sleep_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">{s.total_sleep_hours != null ? `${s.total_sleep_hours} h` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{s.sleep_quality_text || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {[s.sleep_time, s.wake_time].filter(Boolean).join(' → ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={s.notes || ''}>
                          {s.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PortalPagination
                page={pageSleep}
                pageSize={PAGE_SIZE}
                total={sleepRecords.length}
                onPageChange={setPageSleep}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-indigo-500" />
            Sleep patterns (monthly summaries)
          </h2>
          {sleepPatterns.length === 0 ? (
            <p className="text-gray-500 text-sm">No monthly sleep patterns on file.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {paginateSlice(sleepPatterns, pagePattern, PAGE_SIZE).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm"
                  >
                    <p className="font-semibold text-gray-900">{p.period}</p>
                    {p.avg_sleep_hours != null && (
                      <p className="text-gray-700 mt-1">Average sleep: {p.avg_sleep_hours} h / night</p>
                    )}
                    {p.days_with_records != null && (
                      <p className="text-xs text-gray-500 mt-1">Days with records: {p.days_with_records}</p>
                    )}
                    {(p.common_sleep_time || p.common_wake_time) && (
                      <p className="text-xs text-gray-600 mt-2">
                        Typical: {p.common_sleep_time || '—'} → {p.common_wake_time || '—'}
                      </p>
                    )}
                    {p.sleep_quality_score != null && (
                      <p className="text-xs text-gray-600 mt-1">Quality score: {p.sleep_quality_score}</p>
                    )}
                    {p.key_observations && (
                      <p className="text-sm text-gray-700 mt-3 border-t border-indigo-100 pt-2">{p.key_observations}</p>
                    )}
                    {p.notes && <p className="text-xs text-gray-500 mt-2">{p.notes}</p>}
                  </div>
                ))}
              </div>
              <PortalPagination
                page={pagePattern}
                pageSize={PAGE_SIZE}
                total={sleepPatterns.length}
                onPageChange={setPagePattern}
              />
            </>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Incidents & safety
          </h2>
          {incidents.length === 0 ? (
            <p className="text-gray-500 text-sm">No incidents in this date range.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginateSlice(incidents, pageIncident, PAGE_SIZE).map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50/80 align-top">
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i.incident_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                          {i.incident_date ? format(new Date(i.incident_date), 'MMM d, yyyy h:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{i.incident_type || '—'}</td>
                        <td className="px-4 py-3">{severityBadge(i.severity)}</td>
                        <td className="px-4 py-3">{incidentWorkflowBadge(i.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-4">
                {paginateSlice(incidents, pageIncident, PAGE_SIZE).map((i) => (
                  <div
                    key={`detail-${i.id}`}
                    className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 text-sm"
                  >
                    {i.location && <p className="text-xs text-gray-500 mb-2">Location: {i.location}</p>}
                    {i.description && <p className="text-gray-800 whitespace-pre-wrap">{i.description}</p>}
                    {i.action_taken && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium text-gray-700">Action taken: </span>
                        {i.action_taken}
                      </p>
                    )}
                    {i.follow_up && (
                      <p className="text-gray-600 mt-2">
                        <span className="font-medium text-gray-700">Follow-up: </span>
                        {i.follow_up}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <PortalPagination
                page={pageIncident}
                pageSize={PAGE_SIZE}
                total={incidents.length}
                onPageChange={setPageIncident}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
