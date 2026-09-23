// Korean / Japanese switch. Elements carry data-i18n (text) or data-i18n-html (markup with <br>).
(() => {
  const body = {
    ko: '본문 자리입니다. 실제 문안이 확정되면 이 영역에 들어갑니다. 문단 간격과 줄 높이, 읽기 폭(최대 736px)을 확인하기 위한 예시 텍스트입니다.',
    ja: '本文のプレースホルダーです。実際の文面が確定し次第、この欄に入ります。段落の間隔、行の高さ、読みやすい幅（最大736px）を確認するためのサンプルテキストです。',
  };
  const T = {
    ko: {
      'title.home': 'PopiTok',
      'title.privacy': '개인정보처리방침 | PopiTok',
      'title.terms': '서비스약관 | PopiTok',
      'nav.homeLabel': 'PopiTok 홈',
      'nav.home': '홈',
      'nav.privacy': '개인정보처리방침',
      'nav.terms': '서비스약관',
      'nav.more': '메뉴',
      'lang.switch': '日本語に切り替える',
      'store.apple': 'App Store에서 다운로드',
      'store.google': 'Google Play에서 다운로드',
      'intro.title': 'PopiTok은 한국과 일본의 <br>사람들이 만나 교류할 수 있는 공간입니다.',
      'intro.body': '새로운 사람을 만나 관심사와 이야기를 나누고, 서로의 생각과 문화를 공유해보세요.',
      'doc.date': '시행일 2026. 10. 01.',
      'doc.body': body.ko,
      'privacy.title': '개인정보처리방침',
      'privacy.s1': '제1조 수집하는 개인정보 항목',
      'privacy.s2': '제2조 개인정보의 수집 및 이용 목적',
      'privacy.s3': '제3조 보유 및 이용 기간',
      'privacy.s4': '제4조 제3자 제공',
      'privacy.s5': '제5조 이용자의 권리',
      'privacy.s6': '제6조 개인정보 보호책임자',
      'terms.title': '서비스 이용약관',
      'terms.s1': '제1조 목적',
      'terms.s2': '제2조 정의',
      'terms.s3': '제3조 약관의 효력 및 변경',
      'terms.s4': '제4조 서비스의 제공',
      'terms.s5': '제5조 이용자의 의무',
      'terms.s6': '제6조 면책',
    },
    ja: {
      'title.home': 'PopiTok',
      'title.privacy': 'プライバシーポリシー | PopiTok',
      'title.terms': '利用規約 | PopiTok',
      'nav.homeLabel': 'PopiTok ホーム',
      'nav.home': 'ホーム',
      'nav.privacy': 'プライバシーポリシー',
      'nav.terms': '利用規約',
      'nav.more': 'メニュー',
      'lang.switch': '한국어로 전환',
      'store.apple': 'App Storeからダウンロード',
      'store.google': 'Google Playで手に入れよう',
      'intro.title': 'PopiTokは、日本と韓国の人々が<br>出会い、交流できる場所です。',
      'intro.body': '新しい人と出会い、趣味や話題を共有しながら、お互いの考えや文化を分かち合いましょう。',
      'doc.date': '施行日 2026年10月1日',
      'doc.body': body.ja,
      'privacy.title': 'プライバシーポリシー',
      'privacy.s1': '第1条 収集する個人情報の項目',
      'privacy.s2': '第2条 個人情報の収集および利用目的',
      'privacy.s3': '第3条 保有および利用期間',
      'privacy.s4': '第4条 第三者への提供',
      'privacy.s5': '第5条 利用者の権利',
      'privacy.s6': '第6条 個人情報保護責任者',
      'terms.title': '利用規約',
      'terms.s1': '第1条 目的',
      'terms.s2': '第2条 定義',
      'terms.s3': '第3条 規約の効力および変更',
      'terms.s4': '第4条 サービスの提供',
      'terms.s5': '第5条 利用者の義務',
      'terms.s6': '第6条 免責',
    },
  };

  const KEY = 'popitok.lang';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch {} };

  function apply(lang) {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t[el.dataset.i18nHtml]; });
    document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t[el.dataset.i18nLabel]); });
    const titleKey = document.documentElement.dataset.titleKey;
    if (titleKey) document.title = t[titleKey];
  }

  const initial = read() || ((navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'ko');
  apply(T[initial] ? initial : 'ko');

  // one flag: shows the current language, a tap switches to the other
  document.querySelectorAll('.lang').forEach(b => b.addEventListener('click', () => {
    const next = document.documentElement.lang === 'ja' ? 'ko' : 'ja';
    save(next);
    apply(next);
  }));
})();
