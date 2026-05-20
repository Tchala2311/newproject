import React, { useRef, useState } from 'react';
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
      overflow: hidden;
    }
    #ad-wrap {
      width: 100%;
      min-height: 240px;
    }
    #yandex_rtb_${blockId} {
      width: 100%;
      min-height: 240px;
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
    window.yaContextCb.push(function() {
      Ya.Context.AdvManager.render({
        blockId: "${blockId}",
        renderTo: "yandex_rtb_${blockId}"
      });
    });
  </script>
</body>
</html>`;
}

const AD_HTML = buildAdHtml(BLOCK_ID);

type Props = {
  height: number;
  bottomInset: number;
};

export function AdYandex({ height, bottomInset }: Props) {
  const [loaded, setLoaded] = useState(false);
  const webViewRef = useRef<WebView>(null);

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
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Prevent the WebView from capturing swipe gestures meant for the feed
        nestedScrollEnabled={false}
      />
    </View>
  );
}
