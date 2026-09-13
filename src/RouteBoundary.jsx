import React, { Component, Suspense } from 'react';

// Keep the navigation available if a route chunk is unavailable after a deployment
// or a connection failure. A reload obtains the current HTML and hashed assets.
export default class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="route-load-state" role="alert">
      <h1>화면을 불러오지 못했습니다</h1>
      <p>인터넷 연결을 확인한 뒤 다시 불러와 주세요.</p>
      <button className="button primary" onClick={() => window.location.reload()}>다시 불러오기</button>
    </section>;
    return <Suspense fallback={<section className="route-load-state" role="status" aria-live="polite"><p>화면을 불러오고 있습니다.</p></section>}>
      {this.props.children}
    </Suspense>;
  }
}
