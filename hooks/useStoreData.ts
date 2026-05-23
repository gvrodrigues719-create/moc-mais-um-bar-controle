'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Profile, Store, CountArea, CountSession } from '@/lib/types'

export type StoreData = {
  loading: boolean
  isConfigured: boolean
  profile: Profile | null
  store: Store | null
  areas: CountArea[]
  recentSessions: CountSession[]
  error: string | null
}

const INITIAL: StoreData = {
  loading: true,
  isConfigured: false,
  profile: null,
  store: null,
  areas: [],
  recentSessions: [],
  error: null,
}

export function useStoreData(): StoreData {
  const [data, setData] = useState<StoreData>(INITIAL)

  useEffect(() => {
    const configured = isSupabaseConfigured()

    if (!configured) {
      setData({ ...INITIAL, loading: false, isConfigured: false })
      return
    }

    const supabase = createClient()

    async function load() {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser()

        if (userErr || !user) {
          setData({ ...INITIAL, loading: false, isConfigured: true })
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          setData({ ...INITIAL, loading: false, isConfigured: true })
          return
        }

        const [areasRes, storeRes, sessionsRes] = await Promise.all([
          supabase
            .from('count_areas')
            .select('*')
            .eq('store_id', profile.store_id)
            .eq('active', true)
            .order('sort_order'),
          supabase
            .from('stores')
            .select('*')
            .eq('id', profile.store_id)
            .maybeSingle(),
          supabase
            .from('count_sessions')
            .select('*')
            .eq('store_id', profile.store_id)
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        setData({
          loading: false,
          isConfigured: true,
          profile,
          store: storeRes.data ?? null,
          areas: areasRes.data ?? [],
          recentSessions: sessionsRes.data ?? [],
          error: null,
        })
      } catch (err: any) {
        setData({ ...INITIAL, loading: false, isConfigured: true, error: err.message })
      }
    }

    load()
  }, [])

  return data
}
