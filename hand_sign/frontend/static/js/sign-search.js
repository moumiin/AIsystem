/**
 * 수어 검색 모듈
 */
class SignSearch {
  constructor(app) {
    this.app = app;
    this.isLoading = false;
    this._sequence = [];
    this._seqIndex = 0;
    this._phraseSequence = [];
    this._phraseIndex = 0;
    this._initUI();
  }

  _initUI() {
    const searchBtn = document.getElementById('sign-search-btn');
    const searchInput = document.getElementById('sign-search-input');
    if (!searchBtn || !searchInput) return;

    let _isComposing = false;
    searchInput.addEventListener('compositionstart', () => { _isComposing = true; });
    searchInput.addEventListener('compositionend', () => {
      _isComposing = false;
    });
    searchBtn.addEventListener('click', () => this._search(searchInput.value.trim()));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !_isComposing) this._search(searchInput.value.trim());
    });

    document.addEventListener('click', (event) => {
      if (event.target.id === 'seq-prev') this._stepSeq(-1);
      if (event.target.id === 'seq-next') this._stepSeq(+1);
      if (event.target.id === 'phrase-prev') this._stepPhrase(-1);
      if (event.target.id === 'phrase-next') this._stepPhrase(+1);
    });
  }

  async _fetchSignData(query) {
    const response = await fetch('/api/sign-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `"${query}" 수어를 불러오지 못했습니다.`);
    }

    return response.json();
  }

  async _search(query) {
    if (!query || this.isLoading) return;
    this.isLoading = true;
    this._setStatus('loading', `"${query}" 검색 중...`);

    try {
      const data = await this._fetchSignData(query);
      this._applyResult(query, data);
    } catch (error) {
      console.error('수어 검색 오류:', error);
      this._setStatus('error', `오류: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  async startIntroSequence(displayName) {
    const name = (displayName || '').trim();
    if (!name || this.isLoading) return;

    this.isLoading = true;
    this._setStatus('loading', `"안녕하세요, ${name}입니다." 자기소개 시범을 불러오는 중...`);

    try {
      const [helloData, nameData, suffixData] = await Promise.all([
        this._fetchSignData('안녕하세요'),
        this._fetchSignData(name),
        this._fetchSignData('-ㅂ니다'),
      ]);

      const phraseItems = [
        {
          label: '안녕하세요',
          part: '인사',
          sign: this._makePracticeSign('안녕하세요', helloData, '인사'),
        },
      ];

      if (nameData.source === 'fingerspell' && Array.isArray(nameData.sequence)) {
        nameData.sequence.forEach((step, index) => {
          phraseItems.push({
            label: step.jamo || step.name || `${index + 1}`,
            part: '이름',
            sign: this._makePracticeSign(step.jamo || step.name || name, {
              name: step.name || step.jamo,
              source: 'fingerspell',
              data_format: 'jamo',
              hands: 1,
              landmarks: step.landmarks,
              description: `${name} 이름 지문자`,
              hint: '이름을 지문자로 한 글자씩 따라해보세요',
            }, '이름'),
          });
        });
      } else {
        phraseItems.push({
          label: name,
          part: '이름',
          sign: this._makePracticeSign(name, nameData, '이름'),
        });
      }

      phraseItems.push({
        label: '-ㅂ니다',
        part: '종결 표현',
        sign: this._makePracticeSign('-ㅂ니다', suffixData, '입니다'),
      });

      this._sequence = [];
      this._seqIndex = 0;
      this._phraseSequence = phraseItems;
      this._phraseIndex = 0;

      const input = document.getElementById('sign-search-input');
      if (input) input.value = `안녕하세요 ${name}입니다`;

      this._showPhraseStep();
    } catch (error) {
      console.error('자기소개 시범 오류:', error);
      this._setStatus('error', `오류: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  _makePracticeSign(query, data, partLabel = '') {
    const sequence = Array.isArray(data.sequence) ? data.sequence : null;
    const pose = data.landmarks || data.pose || (sequence ? sequence[Math.floor(sequence.length / 2)] : null);

    return {
      id: `intro_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: data.name || query,
      category: 'search',
      source: data.source,
      dataFormat: data.data_format || data.dataFormat || null,
      hands: data.hands || 1,
      emoji: partLabel === '이름' ? '🔤' : '🔎',
      description: data.description || `${query} 수어`,
      hint: data.hint || '시범을 보고 따라해보세요',
      pose,
      sequence,
    };
  }

  _showPhraseStep() {
    const total = this._phraseSequence.length;
    const index = this._phraseIndex;
    const item = this._phraseSequence[index];
    if (!item) return;

    const stepsEl = document.getElementById('sign-search-steps');
    if (stepsEl) {
      const labels = this._phraseSequence.map((seqItem, seqIndex) => {
        const active = seqIndex === index ? 'color:#38bdf8;font-weight:800' : 'color:#94a3b8';
        return `<span style="${active}">${seqItem.label}</span>`;
      }).join('<span style="color:#64748b"> → </span>');

      stepsEl.innerHTML = `
        <div class="sign-search-source-label">
          <span style="color:#38bdf8">로그인 자기소개 시범</span>
        </div>
        <div style="font-size:0.85rem;margin:6px 0 10px">${labels}</div>
        <div class="fingerspell-nav">
          <button id="phrase-prev" ${index === 0 ? 'disabled' : ''}>◀</button>
          <span class="seq-label">${item.part}: ${item.label} &nbsp;(${index + 1} / ${total})</span>
          <button id="phrase-next" ${index === total - 1 ? 'disabled' : ''}>▶</button>
        </div>
      `;
      stepsEl.style.display = 'block';
    }

    this.app.selectSearchSign(item.sign);
    this._setStatus('success', `자기소개 ${index + 1}/${total}: ${item.label}`);
  }

  _stepPhrase(direction) {
    const next = this._phraseIndex + direction;
    if (next < 0 || next >= this._phraseSequence.length) return;
    this._phraseIndex = next;
    this._showPhraseStep();
  }

  _applyResult(query, data) {
    if (data.source === 'fingerspell' && data.sequence?.length > 0) {
      this._sequence = data.sequence;
      this._seqIndex = 0;
      this._showSeqStep(query);
      return;
    }

    if (data.type === 'sequence' && data.sequence?.length > 0) {
      this._sequence = [];
      this._renderSign(query, data.landmarks || data.sequence[Math.floor(data.sequence.length / 2)], data);
      this._setStatus('success', `"${query}" 시범 동작을 불러왔습니다.`);
      return;
    }

    if ((data.source === 'aihub' || data.source === 'kcisa') && (data.video_url || data.videoUrl)) {
      this._sequence = [];
      this._renderVideo(query, data);
      return;
    }

    this._sequence = [];
    this._renderSign(query, data.landmarks, data);
    this._setStatus('success', `"${query}" 수어를 불러왔습니다.`);
  }

  _showSeqStep(query) {
    const total = this._sequence.length;
    const index = this._seqIndex;
    const step = this._sequence[index];
    const jamoList = this._sequence.map((item) => item.jamo).join('-');

    const stepsEl = document.getElementById('sign-search-steps');
    if (stepsEl) {
      stepsEl.innerHTML = `
        <div class="sign-search-source-label">
          <span style="color:#10b981">지문자 분해: ${jamoList}</span>
        </div>
        <div class="fingerspell-nav">
          <button id="seq-prev" ${index === 0 ? 'disabled' : ''}>◀</button>
          <span class="seq-label">${step.jamo} &nbsp;(${index + 1} / ${total})</span>
          <button id="seq-next" ${index === total - 1 ? 'disabled' : ''}>▶</button>
        </div>
      `;
      stepsEl.style.display = 'block';
    }

    this._renderSign(query, step.landmarks, {
      name: step.name,
      source: 'fingerspell',
      hands: 1,
    });
    this._setStatus('success', `"${query}" 지문자 ${index + 1}/${total}: ${step.jamo}`);
  }

  _stepSeq(direction) {
    const next = this._seqIndex + direction;
    if (next < 0 || next >= this._sequence.length) return;
    this._seqIndex = next;
    const input = document.getElementById('sign-search-input');
    this._showSeqStep(input ? input.value.trim() : '');
  }

  _renderVideo(query, data) {
    const videoEl = document.getElementById('aihub-video');
    const canvasEl = document.getElementById('three-canvas');
    const demoCanvasEl = document.getElementById('openpose-demo-canvas');
    const errorEl = document.getElementById('aihub-video-error');
    const stepsEl = document.getElementById('sign-search-steps');
    const stageBar = document.getElementById('demo-stage-bar');

    if (canvasEl) canvasEl.style.display = 'none';
    if (demoCanvasEl) demoCanvasEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (videoEl) videoEl.style.display = 'block';
    if (stageBar) stageBar.style.display = 'none';

    const start = data.video_start ?? 0;
    const end = data.video_end ?? 0;

    const videoUrl = data.video_url || data.videoUrl;
    const provider = data.source === 'kcisa' ? 'KCISA' : 'AI Hub';

    videoEl.classList.remove('jamo-reference-video');
    videoEl.src = videoUrl;
    videoEl.load();

    videoEl.onloadedmetadata = () => {
      videoEl.currentTime = start;
      videoEl.play().catch(() => {});
    };

    videoEl._clipEnd = end;
    videoEl.ontimeupdate = () => {
      if (end > 0 && videoEl.currentTime >= end) {
        videoEl.currentTime = start;
      }
    };

    videoEl.onerror = () => {
      videoEl.style.display = 'none';
      errorEl.style.display = 'flex';
    };

    document.getElementById('sign-badge-name').textContent = data.name || query;
    document.getElementById('sign-badge-emoji').textContent = '🎬';
    document.getElementById('sign-description').textContent = data.description || `${query} 수어`;
    document.getElementById('status-message').textContent = `힌트: ${data.hint || '영상을 보고 따라해보세요'}`;

    if (stepsEl) {
      stepsEl.innerHTML = `
        <div class="sign-search-source-label">
          <span style="color:#3b82f6">${provider} 수어 영상</span>
        </div>`;
      stepsEl.style.display = 'block';
    }

    this._setStatus('success', `"${query}" ${provider} 영상을 불러왔습니다.`);
  }

  _renderSign(query, pose, data) {
    const videoEl = document.getElementById('aihub-video');
    const canvasEl = document.getElementById('three-canvas');
    const demoCanvasEl = document.getElementById('openpose-demo-canvas');
    const errorEl = document.getElementById('aihub-video-error');
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.style.display = 'none';
      videoEl.classList.remove('jamo-reference-video');
    }
    if (errorEl) errorEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = '';
    if (demoCanvasEl) demoCanvasEl.style.display = 'block';

    const sign = {
      id: `search_${Date.now()}`,
      name: data.name || query,
      category: 'search',
      source: data.source,
      dataFormat: data.data_format || data.dataFormat || null,
      hands: data.hands || 1,
      emoji: '🔎',
      description: data.description || `${query} 수어`,
      hint: data.hint || '손 모양을 따라해보세요',
      pose,
      sequence: data.sequence || null,
    };

    const stepsEl = document.getElementById('sign-search-steps');
    if (stepsEl && data.source) {
      const isSequence = data.type === 'sequence' && data.sequence?.length > 0;
        const sourceLabel =
          data.source === 'verified'
            ? '<span style="color:#22c55e">검증된 지문자 데이터</span>'
            : data.source === 'local'
            ? `<span style="color:#10b981">로컬 학습 데이터 (${data.sequence?.length || 1}프레임)</span>`
          : data.source === 'kcisa_keypoint'
          ? `<span style="color:#38bdf8">KCISA 로컬 시범 데이터 (${data.sequence?.length || 1}프레임)</span>`
          : data.source === 'local' && isSequence
          ? `<span style="color:#10b981">로컬 학습 동작 (${data.sequence.length}프레임)</span>`
          : data.source === 'aihub' && isSequence
          ? `<span style="color:#3b82f6">AI Hub 수어 동작 (${data.sequence.length}프레임)</span>`
          : data.source === 'aihub'
          ? '<span style="color:#3b82f6">AI Hub 수어 데이터</span>'
          : '';

      if (sourceLabel) {
        const stepRows = (data.steps?.length > 0)
          ? data.steps.map((stepText, index) =>
              `<div class="step-item"><span class="step-num">${index + 1}</span><span>${stepText}</span></div>`
            ).join('')
          : '';

        stepsEl.innerHTML = `
          <div class="sign-search-curl-section">
            <div class="sign-search-source-label">${sourceLabel}</div>
            ${isSequence ? '<div style="font-size:0.8em;color:#94a3b8;margin-top:4px">동작 흐름을 보고 따라해보세요</div>' : ''}
          </div>
          ${stepRows ? `<div class="sign-search-steps-section">${stepRows}</div>` : ''}
        `;
        stepsEl.style.display = 'block';
      }
    }

    this.app.selectSearchSign(sign);
  }

  _setStatus(type, message) {
    const el = document.getElementById('sign-search-status');
    if (!el) return;
    el.textContent = message;
    el.className = `sign-search-status sign-search-status-${type}`;
  }
}
