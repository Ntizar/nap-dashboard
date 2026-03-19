import { useQuery } from '@tanstack/react-query'
import {
  getDatasets,
  getTransportTypes,
  getFileTypes,
  getRegions,
  getOrganizations,
  getOperators,
  filterDatasets,
  getDownloadLink,
} from '../lib/napClient'

const STALE = 5 * 60 * 1000 // 5 minutos

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: getDatasets,
    staleTime: STALE,
  })
}

export function useFilteredDatasets(filter: object) {
  return useQuery({
    queryKey: ['datasets', 'filter', filter],
    queryFn: () => filterDatasets(filter),
    staleTime: STALE,
    enabled: Object.keys(filter).length > 0,
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

export function useDownloadLink(ficheroId: number | null) {
  return useQuery({
    queryKey: ['downloadLink', ficheroId],
    queryFn: () => getDownloadLink(ficheroId!),
    staleTime: STALE,
    enabled: ficheroId !== null,
  })
}
