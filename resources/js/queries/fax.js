import { queryOptions } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';

/**
 * Centralised React Query factories for the Fax module.
 *
 * All factories return `queryOptions()` objects so they can be reused with
 * `useQuery(...)`, `queryClient.prefetchQuery(...)`, and `queryClient.invalidateQueries(...)`.
 *
 * Key shape:
 *   ['fax']                          // root namespace
 *   ['fax', 'providers']
 *   ['fax', 'settings']
 *   ['fax', 'webhook-url']
 *   ['fax', 'contacts', params]
 *   ['fax', 'numbers']
 *   ['faxes', params]                // outbound + inbound lists
 *   ['fax', id]                      // single fax detail
 *   ['faxCostSummary', month]
 */

export const FAX_NAMESPACE = ['fax'];
export const FAXES_NAMESPACE = ['faxes'];
export const FAX_COST_SUMMARY_NAMESPACE = ['faxCostSummary'];

function unwrap(response) {
    if (response?.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
        return response.data.data;
    }
    return response?.data ?? null;
}

function unwrapPaginated(response) {
    const body = response?.data ?? {};
    return {
        data: Array.isArray(body.data) ? body.data : [],
        meta: body.meta ?? null,
        links: body.links ?? null,
    };
}

async function safeGet(url, params, fallback) {
    try {
        const response = await api.get(url, params ? { params } : undefined);
        return response;
    } catch (err) {
        logger.error(`Fax API GET ${url} failed:`, err);
        throw err;
    }
    // eslint-disable-next-line no-unreachable
    return fallback;
}

/* ----------------------------------------------------------------------------
 * GET /fax/providers
 * -------------------------------------------------------------------------- */
export const faxProvidersQueryOptions = queryOptions({
    queryKey: [...FAX_NAMESPACE, 'providers'],
    queryFn: async () => {
        const response = await safeGet('/fax/providers');
        const body = unwrap(response);
        if (Array.isArray(body)) {
            return body;
        }
        if (body && Array.isArray(body.providers)) {
            return body.providers;
        }
        return [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
});

/* ----------------------------------------------------------------------------
 * GET /fax/settings
 * -------------------------------------------------------------------------- */
export const faxSettingsQueryOptions = queryOptions({
    queryKey: [...FAX_NAMESPACE, 'settings'],
    queryFn: async () => {
        const response = await safeGet('/fax/settings');
        return unwrap(response);
    },
    staleTime: 60 * 1000,
    retry: 1,
});

/* ----------------------------------------------------------------------------
 * GET /fax/settings/webhook-url
 * -------------------------------------------------------------------------- */
export const faxWebhookUrlQueryOptions = queryOptions({
    queryKey: [...FAX_NAMESPACE, 'webhook-url'],
    queryFn: async () => {
        const response = await safeGet('/fax/settings/webhook-url');
        return unwrap(response);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
});

/* ----------------------------------------------------------------------------
 * GET /fax/contacts
 * -------------------------------------------------------------------------- */
export function faxContactsQueryOptions(params = {}) {
    const normalized = {
        search: params.search || undefined,
        type: params.type || undefined,
        active: params.active ?? undefined,
        page: params.page || undefined,
        per_page: params.per_page || undefined,
    };
    return queryOptions({
        queryKey: [...FAX_NAMESPACE, 'contacts', normalized],
        queryFn: async () => {
            const response = await safeGet('/fax/contacts', normalized);
            return unwrapPaginated(response);
        },
        staleTime: 30 * 1000,
        retry: 1,
    });
}

/* ----------------------------------------------------------------------------
 * GET /fax/numbers
 * -------------------------------------------------------------------------- */
export const faxNumbersQueryOptions = queryOptions({
    queryKey: [...FAX_NAMESPACE, 'numbers'],
    queryFn: async () => {
        const response = await safeGet('/fax/numbers');
        const list = unwrap(response);
        return Array.isArray(list) ? list : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
});

/* ----------------------------------------------------------------------------
 * GET /fax
 * -------------------------------------------------------------------------- */
export function faxesQueryOptions(params = {}) {
    const normalized = {
        direction: params.direction || undefined,
        status: params.status || undefined,
        type: params.type || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        search: params.search || undefined,
        contact_id: params.contact_id || undefined,
        resident_id: params.resident_id || undefined,
        sender_id: params.sender_id || undefined,
        page: params.page || undefined,
        per_page: params.per_page || undefined,
    };
    return queryOptions({
        queryKey: [...FAXES_NAMESPACE, normalized],
        queryFn: async () => {
            const response = await safeGet('/fax', normalized);
            return unwrapPaginated(response);
        },
        staleTime: 15 * 1000,
        retry: 1,
    });
}

/* ----------------------------------------------------------------------------
 * GET /fax/{id}
 * -------------------------------------------------------------------------- */
export function faxDetailQueryOptions(id) {
    return queryOptions({
        queryKey: [...FAX_NAMESPACE, id],
        queryFn: async () => {
            const response = await safeGet(`/fax/${id}`);
            return unwrap(response);
        },
        enabled: Boolean(id),
        staleTime: 15 * 1000,
        retry: 1,
    });
}

/* ----------------------------------------------------------------------------
 * GET /fax/cost-summary?month=YYYY-MM
 * -------------------------------------------------------------------------- */
export function faxCostSummaryQueryOptions(month) {
    return queryOptions({
        queryKey: [...FAX_COST_SUMMARY_NAMESPACE, month || 'current'],
        queryFn: async () => {
            const response = await safeGet('/fax/cost-summary', month ? { month } : undefined);
            return unwrap(response);
        },
        staleTime: 60 * 1000,
        retry: 1,
    });
}
