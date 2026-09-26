-- Pin search_path on the website's housekeeping functions (Supabase
-- advisor 0011, "function search path mutable"). The bodies already use
-- schema-qualified names, so an empty search_path is safe.
-- Applied to project oqwbmtdrjxfbnitlzehe on 2026-09-26.
alter function public.prune_analytics(integer) set search_path = '';
alter function public.prune_lead_submissions()  set search_path = '';
