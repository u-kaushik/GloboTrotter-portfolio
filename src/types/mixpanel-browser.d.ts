declare module 'mixpanel-browser' {
  const mixpanel: {
    init(token: string, config?: any): void;
    track(eventName: string, props?: any): void;
    identify?(distinctId: string): void;
    people?: {
      set?(props: any): void;
    };
    // allow default import
  };
  export default mixpanel;
}
