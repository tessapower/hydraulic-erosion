// MobileDetector.ts: Utility for detecting mobile devices and capabilities

export class MobileDetector {
  /**
   * Check if the device is likely a mobile device based on user agent and screen size
   */
  static isMobile(): boolean {
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

    // Also check for touch support and small screens
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;

    // Return true if mobile user agent OR if both touch and small screen
    return isMobileUA || (hasTouchScreen && isSmallScreen);
  }

  /**
   * Check if device supports touch events
   */
  static hasTouch(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get an appropriate performance tier for the device
   * Returns 'high', 'medium', or 'low'
   */
  static getPerformanceTier(): 'high' | 'medium' | 'low' {
    // Use hardware concurrency as a rough guide
    const cores = navigator.hardwareConcurrency || 2;

    if (this.isMobile()) {
      // Mobile devices generally need more conservative settings
      return cores >= 8 ? 'medium' : 'low';
    }

    return cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low';
  }

  /**
   * Get recommended time budget for erosion simulation based on device
   */
  static getTimeBudget(): number {
    const tier = this.getPerformanceTier();

    switch (tier) {
      case 'high':
        return 16; // ~60fps
      case 'medium':
        return 33; // ~30fps
      case 'low':
        return 50; // ~20fps
      default:
        return 16;
    }
  }

  /**
   * Get recommended pixel ratio based on device
   */
  static getRecommendedPixelRatio(): number {
    const tier = this.getPerformanceTier();
    const dpr = window.devicePixelRatio || 1;

    switch (tier) {
      case 'high':
        return Math.min(dpr, 2);
      case 'medium':
        return Math.min(dpr, 1.5);
      case 'low':
        return 1;
      default:
        return Math.min(dpr, 2);
    }
  }
}

