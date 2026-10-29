/**
 * 범용 크롤링 프록시 - Google Apps Script 버전
 * 코드 수정 없이 URL 파라미터만으로 어떤 사이트든 크롤링
 * 
 * 설치: https://script.google.com -> 새 프로젝트 -> 이 코드 붙여넣기 -> 배포 -> 웹앱
 * 사용법: https://your-gas-url/exec?url=https://원하는주소.com&selector=.title&type=text
 */

// 범용 크롤링 엔드포인트
function doGet(e) {
  const params = e.parameter;
  
  // 필수: url 파라미터
  const targetUrl = params.url;
  if (!targetUrl) {
    return jsonResponse({
      success: false,
      error: "url 파라미터가 필요합니다. 예: ?url=https://example.com",
      usage: {
        url: "크롤링할 주소 (필수)",
        selector: "CSS 선택자 (선택, 예: .title, #content, h1)",
        type: "text | html | json | attr:href (선택, 기본: text)",
        youtube: "true면 유튜브 자막 모드로 작동 (선택)"
      },
      examples: [
        "?url=https://example.com",
        "?url=https://example.com&selector=h1",
        "?url=https://www.youtube.com/watch?v=RGYoYi56G_8&youtube=true",
        "?url=https://news.com&selector=.article-title&type=text"
      ]
    });
  }
  
  try {
    // 유튜브 자막 모드
    if (params.youtube === "true" || targetUrl.includes("youtube.com/watch")) {
      const videoId = extractVideoId(targetUrl);
      const transcript = getYouTubeTranscript(videoId);
      return jsonResponse({
        success: true,
        mode: "youtube_transcript",
        url: targetUrl,
        videoId: videoId,
        transcript: transcript,
        length: transcript.length
      });
    }
    
    // 일반 웹 크롤링 모드
    const result = crawlWebsite(targetUrl, params.selector, params.type);
    return jsonResponse({
      success: true,
      mode: "web_crawl",
      url: targetUrl,
      selector: params.selector || "body",
      type: params.type || "text",
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      url: targetUrl,
      error: error.toString(),
      stack: error.stack
    });
  }
}

function crawlWebsite(url, selector, type) {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode}: ${response.getContentText().substring(0, 200)}`);
  }
  
  const html = response.getContentText();
  const contentType = response.getHeaders()['Content-Type'] || '';
  
  // JSON 응답인 경우
  if (contentType.includes('application/json') || (type === 'json')) {
    try {
      return JSON.parse(html);
    } catch (e) {
      return html;
    }
  }
  
  // selector가 없으면 전체 HTML 반환
  if (!selector) {
    if (type === 'html') return html;
    // 텍스트만 추출 (태그 제거)
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 10000);
  }
  
  // 간단한 CSS 선택자 파싱 (정규식 기반, 경량)
  // 복잡한 선택자는 Cheerio 같은 라이브러리 필요하지만 GAS에서는 정규식으로 처리
  return parseWithSelector(html, selector, type);
}

function parseWithSelector(html, selector, type) {
  const results = [];
  
  // ID 선택자: #id
  if (selector.startsWith('#')) {
    const id = selector.substring(1);
    const regex = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
    const match = html.match(regex);
    if (match) {
      results.push(cleanText(match[1], type));
    }
  }
  // 클래스 선택자: .class
  else if (selector.startsWith('.')) {
    const className = selector.substring(1);
    const regex = new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push(cleanText(match[1], type));
      if (results.length >= 20) break; // 최대 20개
    }
  }
  // 태그 선택자: h1, title, etc
  else {
    const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi');
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push(cleanText(match[1], type));
      if (results.length >= 20) break;
    }
  }
  
  return results.length === 1 ? results[0] : results;
}

function cleanText(text, type) {
  if (!text) return '';
  
  if (type === 'html') return text.trim();
  
  if (type && type.startsWith('attr:')) {
    const attr = type.split(':')[1];
    const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const match = text.match(regex);
    return match ? match[1] : '';
  }
  
  // 텍스트 모드: HTML 태그 제거
  return text.replace(/<[^>]*>/g, ' ')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/\s+/g, ' ')
             .trim();
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url; // 이미 ID인 경우
}

function getYouTubeTranscript(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = UrlFetchApp.fetch(videoUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    muteHttpExceptions: true
  });
  
  const html = response.getContentText();
  const baseUrlMatch = html.match(/"baseUrl":\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
  
  if (!baseUrlMatch) {
    const tracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (tracksMatch) {
      const tracks = JSON.parse(tracksMatch[1]);
      const koTrack = tracks.find(t => t.languageCode === 'ko');
      const track = koTrack || tracks[0];
      if (track) {
        return fetchTimedText(track.baseUrl.replace(/\\u0026/g, '&').replace(/\\/g, ''));
      }
    }
    throw new Error("자막을 찾을 수 없습니다");
  }
  
  let baseUrl = baseUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
  return fetchTimedText(baseUrl);
}

function fetchTimedText(baseUrl) {
  const response = UrlFetchApp.fetch(baseUrl, { muteHttpExceptions: true });
  const xml = response.getContentText();
  const matches = [...xml.matchAll(/<text[^>]*>(.*?)<\/text>/g)];
  return matches.map(m => 
    m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n/g, ' ')
  ).join(' ').replace(/\s+/g, ' ').trim();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 테스트 함수
function testUniversal() {
  // 일반 사이트
  const result1 = crawlWebsite("https://example.com", "h1", "text");
  Logger.log(result1);
  
  // 유튜브
  const result2 = getYouTubeTranscript("RGYoYi56G_8");
  Logger.log(result2.substring(0, 200));
}
