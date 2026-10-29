# 범용 크롤링 프록시 (GitHub 기록 기능 포함)

## 핵심 기능: 추출 결과를 GitHub에 자동 기록!

### 동작 방식
1. Actions > Run workflow > URL 입력
2. 크롤링 실행
3. **결과가 자동으로 `data/` 폴더에 커밋됨**
4. GitHub 리포지토리에서 영구 보관, 히스토리 추적 가능

### 폴더 구조 (자동 생성)
```
data/
├── index.md              # 전체 크롤링 히스토리 로그 (표 형식)
├── latest.json           # 마지막 크롤링 결과 (항상 최신)
├── playwright_latest.json # Playwright 마지막 결과
├── qt_latest.json        # QT 마지막 결과
├── example.com_20241030_073000.json  # 개별 크롤링 결과들
├── playwright_example.com_20241030_073001.json
└── qt_2024-10-30.json
qt/
└── 2024-10-30_VIDEOID.txt  # QT 원문
```

### 사용법

#### 1. 범용 크롤링 (기록 포함)
Actions > **Universal Web Crawler (with History)** > Run workflow
- url: https://원하는주소.com
- selector: h1 (선택)
- filename: my_result.json (선택, 비우면 자동생성)

실행 후:
- `data/my_result.json` 자동 커밋
- `data/index.md` 에 히스토리 한 줄 추가
- GitHub > data 폴더에서 바로 확인 가능

#### 2. Playwright 고급 크롤링 (기록 포함)
Actions > **Playwright Advanced Crawler (with History)**
- url, actions_json, filename 입력
- 결과 `data/playwright_*.json` 자동 커밋

#### 3. 매일 QT 자동 (기록 포함)
Actions > **Daily QT Automation**
- 매일 KST 07:00 자동 실행
- `qt/YYYY-MM-DD_VIDEOID.txt` + `data/qt_*.json` 자동 커밋

### GitHub에서 기록 확인 방법
1. 리포지토리 메인 > `data/` 폴더 클릭
2. `index.md` 파일: 전체 크롤링 히스토리 표
3. `latest.json`: 마지막 결과 바로 보기
4. 각 `.json` 파일: 개별 크롤링 상세 데이터

### 외부에서 호출 (Meta AI가 호출)
Meta AI가 다음 URL로 최신 결과 가져올 수 있음:
- https://raw.githubusercontent.com/USERNAME/REPO/main/data/latest.json
- https://raw.githubusercontent.com/USERNAME/REPO/main/data/index.md

### 설치
1. GitHub Public 리포지토리 생성
2. 이 zip 내용 전체 업로드
3. Actions 탭에서 실행

### 권한 설정 필요
리포지토리 > Settings > Actions > General > Workflow permissions
-> **Read and write permissions** 체크 ✅
