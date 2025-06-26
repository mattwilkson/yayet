// OPTIMIZED QUERY PATTERNS FOR PRODUCTION SCALABILITY
// Implements caching, batching, and performance monitoring

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const queryCache = new QueryCache();

// Performance monitoring utility
export const performanceMonitor = {
  startTimer: (operation: string) => {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`);
        
        // Log slow operations
        if (duration > 1000) {
          console.warn(`🐌 Slow operation detected: ${operation} (${duration.toFixed(2)}ms)`);
        }
        
        return duration;
      }
    };
  }
};

// Optimized dashboard data fetching with caching and batching
export const fetchOptimizedDashboardData = async (
  familyId: string, 
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedDashboardData');
  
  const cacheKey = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId || 'all'}`;
  
  // Check cache first
  const cached = queryCache.get(cacheKey);
  if (cached) {
    console.log('📊 Using cached dashboard data');
    timer.end();
    return cached;
  }

  console.log('📊 Fetching fresh dashboard data with optimized queries');
  
  try {
    // Batch all queries for better performance
    const [familyInfo, events, familyMembers] = await Promise.all([
      fetchOptimizedFamilyInfo(familyId),
      fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
      fetchOptimizedFamilyMembers(familyId)
    ]);

    const dashboardData = {
      familyInfo,
      events,
      familyMembers,
      timestamp: Date.now()
    };

    // Cache for 3 minutes (shorter for real-time feel)
    queryCache.set(cacheKey, dashboardData, 3 * 60 * 1000);
    
    timer.end();
    return dashboardData;
  } catch (error) {
    timer.end();
    throw error;
  }
};

// Optimized family info fetching
const fetchOptimizedFamilyInfo = async (familyId: string) => {
  const cacheKey = `family-info-${familyId}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, admin_user_id, created_at')
    .eq('id', familyId)
    .single();

  if (error) throw error;
  
  // Cache family info for 10 minutes (changes rarely)
  queryCache.set(cacheKey, data, 10 * 60 * 1000);
  return data;
};

// Optimized event fetching with reduced date range and smart filtering
const fetchOptimizedEvents = async (
  familyId: string, 
  currentDate: Date, 
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedEvents');
  
  // Reduce date range for better performance (2 weeks before, 4 weeks after)
  const weekStart = startOfWeek(currentDate);
  const rangeStart = subWeeks(weekStart, 2);
  const rangeEnd = addWeeks(weekStart, 4);
  
  try {
    // Use the optimized recurring event manager
    const { recurringEventManager } = await import('./recurringEventManager');
    const familyEvents = await recurringEventManager.getEventsForDateRange(
      familyId,
      rangeStart,
      rangeEnd
    );

    // Filter for personal view if needed
    let filteredEvents = familyEvents;
    if (viewMode === 'personal' && userId) {
      // Get user's family member record for filtering
      const { data: userMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (userMember) {
        filteredEvents = familyEvents.filter(event => {
          return event.event_assignments?.some((assignment: any) => 
            assignment.family_member_id === userMember.id
          );
        });
      } else {
        filteredEvents = [];
      }
    }

    // Fetch holidays and special events in parallel
    const [holidays, specialEvents] = await Promise.all([
      fetchOptimizedHolidays(rangeStart, rangeEnd),
      fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
    ]);

    // Combine all events
    const allEvents = [...filteredEvents, ...holidays, ...specialEvents];
    
    timer.end();
    return allEvents;
  } catch (error) {
    timer.end();
    throw error;
  }
};

// Optimized family members fetching
const fetchOptimizedFamilyMembers = async (familyId: string) => {
  const cacheKey = `family-members-${familyId}`;
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('family_members')
    .select('id, name, nickname, relationship, category, color, role, user_id, birthday, anniversary, address')
    .eq('family_id', familyId)
    .order('name');

  if (error) throw error;
  
  // Cache family members for 5 minutes
  queryCache.set(cacheKey, data || [], 5 * 60 * 1000);
  return data || [];
};

// Optimized holiday fetching with caching
const fetchOptimizedHolidays = async (startDate: Date, endDate: Date) => {
  const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
  const cacheKey = `holidays-${monthKey}`;
  
  const cached = queryCache.get(cacheKey);
  if (cached) {
    // Filter cached holidays to the exact date range
    return cached.filter((holiday: any) => {
      const holidayDate = new Date(holiday.start_time);
      return holidayDate >= startDate && holidayDate <= endDate;
    });
  }

  // Fetch holidays for the entire month to maximize cache efficiency
  const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  
  const { fetchHolidays, convertHolidaysToEvents } = await import('./holidays');
  const holidays = await fetchHolidays(monthStart, monthEnd);
  const holidayEvents = convertHolidaysToEvents(holidays);
  
  // Cache for 24 hours (holidays don't change)
  queryCache.set(cacheKey, holidayEvents, 24 * 60 * 60 * 1000);
  
  // Return filtered results
  return holidayEvents.filter((holiday: any) => {
    const holidayDate = new Date(holiday.start_time);
    return holidayDate >= startDate && holidayDate <= endDate;
  });
};

// Optimized special events with smart caching
const fetchOptimizedSpecialEvents = async (familyId: string, startDate: Date, endDate: Date) => {
  const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
  const cacheKey = `special-events-${familyId}-${monthKey}`;
  
  const cached = queryCache.get(cacheKey);
  if (cached) {
    // Filter cached special events to the exact date range
    return cached.filter((event: any) => {
      const eventDate = new Date(event.start_time);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // Generate special events for the entire month
  const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  
  const { generateSpecialEvents } = await import('./specialEvents');
  const specialEvents = await generateSpecialEvents(familyId, monthStart, monthEnd);
  
  // Cache for 1 hour (special events are relatively static)
  queryCache.set(cacheKey, specialEvents, 60 * 60 * 1000);
  
  // Return filtered results
  return specialEvents.filter((event: any) => {
    const eventDate = new Date(event.start_time);
    return eventDate >= startDate && eventDate <= endDate;
  });
};

// Batch operations for better performance
const batchCreateEvents = async (events: any[]) => {
  const timer = performanceMonitor.startTimer('batchCreateEvents');
  
  try {
    // Split into batches of 50 to avoid hitting Supabase limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        supabase.from('events').insert(batch).select()
      )
    );

    timer.end();
    return results.flatMap(result => result.data || []);
  } catch (error) {
    timer.end();
    throw error;
  }
};

// Cache management utilities
export const cacheUtils = {
  // Clear all cached data
  clearAll: () => {
    queryCache.clear();
    console.log('🗑️ All cached data cleared');
  },
  
  // Clear family-specific cache
  clearFamily: (familyId: string) => {
    const keys = Array.from(queryCache['cache'].keys());
    const familyKeys = keys.filter(key => key.includes(familyId));
    
    familyKeys.forEach(key => {
      queryCache['cache'].delete(key);
    });
    
    console.log(`🗑️ Cleared cache for family ${familyId} (${familyKeys.length} entries)`);
  },
  
  // Get cache statistics
  getStats: () => {
    const size = queryCache.size();
    const memoryUsage = JSON.stringify(Array.from(queryCache['cache'].values())).length;
    
    return {
      entries: size,
      estimatedMemoryKB: Math.round(memoryUsage / 1024),
      maxRecommendedEntries: 100
    };
  }
};

// Helper functions for date operations
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { supabase } from './supabase';