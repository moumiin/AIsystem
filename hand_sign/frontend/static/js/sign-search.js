/**
 * 수어 검색 모듈
 */
class SignSearch {
  constructor(app) {
    this.app = app;
    this.isLoading = false;
    this._sequence = [];
    this._seqIndex = 0;
    this._initUI();
  }

  _initUI() {
    const searchBtn = document.getElementById('sign-search-btn');
    const searchInput = document.getElementById('sign-search-input');
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', () => this._search(searchInput.value.trim()));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this._search(searchInput.value.trim());
    });

    document.addEventListener('click', (event) => {
      if (event.target.id === 'seq-prev') this._stepSeq(-1);
      if (event.target.id === 'seq-next') this._stepSeq(+1);
    });
  }

  async _search(query) {
    if (!query || this.isLoading) return;
    this.isLoading = true;
    this._setStatus('loading', `"${query}" 검색 중...`);

    try {
      const response = await fetch('/api/sign-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '검색에 실패했습니다.');
      }

      const data = await response.json();
      this._applyResult(query, data);
    } catch (error) {
      console.error('수어 검색 오류:', error);
      this._setStatus('error', `오류: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  _applyResult(query, data) {
    if (data.source === 'fingerspell' && data.sequence?.length > 0) {
      this._sequence = data.sequence;
      this._seqIndex = 0;
      this._showSeqStep(query);
      return;
    }

    if (data.source === 'aihub' && data.video_url) {
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

    this._renderSign(query, step.landmarks, { name: step.name });
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
    const errorEl = document.getElementById('aihub-video-error');
    const stepsEl = document.getElementById('sign-search-steps');
    const stageBar = document.getElementById('demo-stage-bar');

    canvasEl.style.display = 'none';
    errorEl.style.display = 'none';
    videoEl.style.display = 'block';
    if (stageBar) stageBar.style.display = 'none';

    const start = data.video_start ?? 0;
    const end = data.video_end ?? 0;

    videoEl.src = data.video_url;
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
          <span style="color:#3b82f6">AI Hub 수어 영상 (${start.toFixed(1)}s ~ ${end.toFixed(1)}s)</span>
        </div>`;
      stepsEl.style.display = 'block';
    }

    this._setStatus('success', `"${query}" AI Hub 영상을 불러왔습니다.`);
  }

  _renderSign(query, pose, data) {
    const videoEl = document.getElementById('aihub-video');
    const canvasEl = document.getElementById('three-canvas');
    const errorEl = document.getElementById('aihub-video-error');
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
      videoEl.style.display = 'none';
    }
    if (errorEl) errorEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = '';

    const sign = {
      id: `search_${Date.now()}`,
      name: data.name || query,
      category: 'search',
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
