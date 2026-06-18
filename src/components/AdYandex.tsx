import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

const BLOCK_ID = 'R-A-19307505-1';

// Minimal self-contained HTML page that loads the Yandex ad block.
// Dark background matches the app theme so there's no white flash.
function buildAdHtml(blockId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #08071A;
      width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #ad-wrap {
      width: 100%;
    }
    #yandex_rtb_${blockId} {
      width: 100%;
      display: block;
    }
  </style>
  <script>window.yaContextCb = window.yaContextCb || []</script>
  <script src="https://yandex.ru/ads/system/context.js" async></script>
</head>
<body>
  <div id="ad-wrap">
    <div id="yandex_rtb_${blockId}"></div>
  </div>
  <script>
    function flikPost(tag) {
      try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(tag); } catch (e) {}
    }
    window.yaContextCb.push(function() {
      try {
        Ya.Context.AdvManager.render({
          blockId: "${blockId}",
          renderTo: "yandex_rtb_${blockId}",
          onRender: function() { flikPost('ad-ok'); },
          onError: function() { flikPost('ad-fail'); }
        });
      } catch (e) { flikPost('ad-fail'); }
      // Fallback: signal anyway if the SDK never invokes a callback.
      setTimeout(function() { flikPost('ad-timeout'); }, 4000);
    });
  </script>
</body>
</html>`;
}

const AD_HTML = buildAdHtml(BLOCK_ID);

type Props = {
  height: number;
  bottomInset: number;
  // Fires when the ad has actually rendered (or definitively failed/timed out),
  // so callers can gate a skip/continue button on a real impression rather than
  // a blind fixed delay.
  onLoaded?: () => void;
};

export function AdYandex({ height, bottomInset, onLoaded }: Props) {
  const [loaded, setLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const firedRef = useRef(false);

  // Signal "ad resolved" exactly once — on render, failure, timeout, or the
  // native safety net below — so a gating caller is never stuck waiting.
  const fire = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onLoaded?.();
  };

  // Safety net: if no in-page signal ever arrives (script blocked, offline),
  // resolve anyway after a few seconds.
  useEffect(() => {
    const t = setTimeout(fire, 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ad slots mount/unmount constantly as the feed is swiped; stopping the
  // WebView on unmount halts the in-page Yandex script and curbs native memory
  // growth on Android.
  useEffect(() => () => { try { webViewRef.current?.stopLoading(); } catch {} }, []);

  return (
    <View style={{ height, width: '100%', backgroundColor: '#08071A' }}>
      {!loaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#C99FE6" size="large" />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: AD_HTML, baseUrl: 'https://flik-games.com' }}
        style={{ flex: 1, backgroundColor: '#08071A' }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        onLoad={() => setLoaded(true)}
        onError={() => { setLoaded(true); fire(); }}
        onMessage={() => { setLoaded(true); fire(); }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        nestedScrollEnabled={false}
      />
    </View>
  );
}
