import { useQuery } from '@tanstack/react-query'
import {
  getDatasets,
  getTransportTypes,
  getFileTypes,
  getRegions,
  getOrganizations,
  getOperators,
  filterDatasets,
} from '../lib/napClient'
import type { FilterBody } from '../lib/types'

const STALE = 5 * 60 * 1000 // 5 minutos

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
    staleTime: STALE,
  })
}

export function useFilteredDatasets(filter: FilterBody, enabled: boolean) {
  return useQuery({
    queryKey: ['datasets', 'filter', filter],
    queryFn: () => filterDatasets(filter),
    staleTime: STALE,
    enabled,
  })
}

export function useTransportTypes() {
  return useQuery({
    queryKey: ['transportTypes'],
    queryFn: getTransportTypes,
    staleTime: STALE,
  })
}

export function useFileTypes() {
  return useQuery({
    queryKey: ['fileTypes'],
    queryFn: getFileTypes,
    staleTime: STALE,
  })
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: STALE,
  })
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
    staleTime: STALE,
  })
}

export function useOperators() {
  return useQuery({
    queryKey: ['operators'],
    queryFn: getOperators,
    staleTime: STALE,
  })
}
