/**
 * Analytics helper for devxtools.dev
 * 
 * Dispatches custom events that can be captured by analytics providers.
 * Currently no third-party script is loaded, but the structure is ready
 * for future integration with Cloudflare Web Analytics custom events
 * or other providers.
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

export function track(event: string, properties?: Record<string, any>): void {
  // Dispatch custom event for potential listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('devx:analytics', {
        detail: { event, properties }
      })
    );
  }
  
  // Call existing analytics if present (e.g., Cloudflare Web Analytics)
  // Currently Cloudflare Web Analytics doesn't support custom events natively,
  // but this hook is ready for when they do or for other providers
  if (typeof window !== 'undefined' && (window as any).analytics) {
    try {
      (window as any).analytics.track(event, properties);
    } catch (e) {
      // Silently fail - analytics should never break the app
    }
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, properties);
  }
}

// Specific event helpers
export const analytics = {
  pickerView(source: 'nav' | 'home_widget' | 'section_widget' | 'direct', hasParams: boolean) {
    track('picker_view', { source, has_params: hasParams });
  },
  
  pickerFilterChange(group: string, value: string, selected: boolean, resultCount: number) {
    track('picker_filter_change', { group, value, selected, result_count: resultCount });
  },
  
  pickerResultClick(slug: string, group: 'best' | 'also', position: number, filters: any) {
    track('picker_result_click', { slug, group, position, filters });
  },
  
  pickerEmpty(filters: any, suggestedRelax: string) {
    track('picker_empty', { filters, suggested_relax: suggestedRelax });
  },
  
  pickerRelaxClick(removedFilter: string) {
    track('picker_relax_click', { removed_filter: removedFilter });
  },
  
  pickerClear() {
    track('picker_clear', {});
  },
  
  pickerCopyLink(filters: any) {
    track('picker_copy_link', { filters });
  },
  
  pickerSubmitClick(filters: any) {
    track('picker_submit_click', { filters });
  }
};
