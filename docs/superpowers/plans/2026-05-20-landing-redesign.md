# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/landing/src/pages/index.astro`를 리디자인해 ERDify AI·MCP·CLI·REST API 차별화 기능을 명확하게 보여주는 랜딩 페이지로 교체한다.

**Architecture:** 단일 Astro 파일(`index.astro`) 교체. 기존 Layout·SiteHeader 컴포넌트는 그대로 사용. JS는 파일 하단 `<script>` 블록에 인라인.

**Tech Stack:** Astro, vanilla CSS (인라인 `<style>`), TypeScript (script 블록)

---

## 섹션 구조 (위→아래)

1. **Hero** — 다크 배경(`#0a0f1e`), 타이틀 "ERD를 AI로, 어디서든", 부제 "당신의 워크플로에 맞게", CTA 버튼 2개, 4채널 pill
2. **ERDify AI** — Claude·GPT-4o pill, 2×2 기능 카드 (AI 채팅·컬럼 제안·ERD 자동 생성·스키마 분석)
3. **다양한 AI 창구** — 4채널 카드 가로 배치 (ERDify AI accent, MCP·CLI·REST API)
4. **핵심 기능** — 실시간 협업 + DDL·ORM 2-col 카드
5. **MCP 설치 가이드** — 탭(Cursor·Claude Desktop·Gemini·Codex) + 코드 블록
6. **가격** — 단일 베타 무료 플랜 카드
7. **CTA 배너** — 단색 파란 배경
8. **Footer** — 다크 배경, 기존 링크 구조 유지

---

### Task 1: index.astro 전체 교체

**Files:**
- Modify: `apps/landing/src/pages/index.astro` (전체 교체)

- [ ] **Step 1: 파일 교체**

`apps/landing/src/pages/index.astro` 전체를 아래 내용으로 교체한다.

```astro
---
import Layout from '../layouts/Layout.astro';
import SiteHeader from '../components/SiteHeader.astro';

const APP_URL = 'http://erdify-app.kro.kr';
---

<Layout>
  <SiteHeader />

  <!-- ── HERO ── -->
  <section class="hero">
    <div class="container">
      <div class="hero-badge">✦ ERDify AI · MCP · CLI · REST API</div>
      <h1 class="hero-title">ERD를 <span class="hl">AI로</span>,<br />어디서든</h1>
      <p class="hero-sub">당신의 워크플로에 맞게 —<br />앱에서, Cursor에서, 터미널에서</p>
      <div class="hero-actions">
        <a href={`${APP_URL}/register`} class="btn-primary btn-lg">무료로 시작하기 →</a>
        <a href="#integrations" class="btn-ghost btn-lg">연동 가이드 보기</a>
      </div>
      <div class="hero-channels">
        <span class="hc-pill">🤖 ERDify AI</span>
        <span class="hc-pill">🔌 MCP</span>
        <span class="hc-pill">💻 CLI</span>
        <span class="hc-pill">🌐 REST API</span>
      </div>
    </div>
  </section>

  <!-- ── ERDIFY AI ── -->
  <section class="ai-section" id="features">
    <div class="container">
      <div class="section-header">
        <div class="eyebrow">ERDify AI</div>
        <h2>앱 안에서 바로 AI와 설계하세요</h2>
        <p>별도 설정 없이 ERDify 안에서 Claude·GPT-4o와 대화하며 스키마를 만드세요.</p>
      </div>
      <div class="ai-providers">
        <span class="ai-pill">🤖 Claude (Anthropic)</span>
        <span class="ai-pill">✨ GPT-4o (OpenAI)</span>
      </div>
      <div class="ai-grid">
        <div class="ai-card">
          <div class="ai-card-icon">💬</div>
          <h3>AI 채팅</h3>
          <p>ERD를 보면서 AI에게 묻고 변경을 바로 적용하세요.</p>
        </div>
        <div class="ai-card">
          <div class="ai-card-icon">✨</div>
          <h3>컬럼 제안</h3>
          <p>테이블 이름만 입력하면 AI가 컬럼 구조를 추천해줍니다.</p>
        </div>
        <div class="ai-card">
          <div class="ai-card-icon">🗺️</div>
          <h3>ERD 자동 생성</h3>
          <p>자연어 설명 한 줄로 전체 ERD를 즉시 만들어줍니다.</p>
        </div>
        <div class="ai-card">
          <div class="ai-card-icon">🔍</div>
          <h3>스키마 분석</h3>
          <p>구조적 문제점과 개선 방향을 AI가 제안합니다.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CHANNELS ── -->
  <section class="channels-section">
    <div class="container">
      <div class="section-header">
        <div class="eyebrow">다양한 AI 창구</div>
        <h2>사용하는 도구에서 바로</h2>
        <p>ERDify는 네 가지 방법으로 연결됩니다. 원하는 방식을 고르세요.</p>
      </div>
      <div class="ch-grid">
        <div class="ch-card ch-card--accent">
          <div class="ch-icon">🤖</div>
          <h3>ERDify AI</h3>
          <p>앱 내 AI 채팅으로 가장 빠르게 시작</p>
        </div>
        <div class="ch-card">
          <div class="ch-icon">🔌</div>
          <h3>MCP</h3>
          <p>Cursor · Claude · Gemini · Codex에서 직접 연동</p>
        </div>
        <div class="ch-card">
          <div class="ch-icon">💻</div>
          <h3>CLI</h3>
          <p>터미널에서 <code>npx erdify</code>로 조회·내보내기</p>
        </div>
        <div class="ch-card">
          <div class="ch-icon">🌐</div>
          <h3>REST API</h3>
          <p>서비스 코드에서 직접 통합, OpenAPI 문서 제공</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CORE FEATURES ── -->
  <section class="features-section">
    <div class="container">
      <div class="section-header">
        <div class="eyebrow">핵심 기능</div>
        <h2>협업과 코드 생성</h2>
      </div>
      <div class="feat-grid">
        <div class="feat-card">
          <div class="feat-icon">⚡</div>
          <h3>실시간 팀 협업</h3>
          <p>팀원과 동시에 ERD를 편집하세요. 커서 위치와 변경 사항이 실시간으로 반영됩니다.</p>
        </div>
        <div class="feat-card">
          <div class="feat-icon">⇅</div>
          <h3>DDL · ORM 변환</h3>
          <p>MySQL·PostgreSQL DDL을 붙여넣으면 ERD 자동 생성. TypeORM·Prisma·SQLAlchemy 코드도 바로 내보냅니다.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── MCP SETUP ── -->
  <section class="integrations" id="integrations">
    <div class="container">
      <div class="section-header">
        <div class="eyebrow">AI 연동</div>
        <h2>30초 만에 MCP 연결</h2>
        <p>사용하는 AI 도구의 설정 파일에 아래 내용을 추가하면 끝입니다.</p>
      </div>

      <div class="it-tabs" role="tablist">
        <button class="it-tab it-tab--active" data-tool="cursor">Cursor</button>
        <button class="it-tab" data-tool="claude">Claude Desktop</button>
        <button class="it-tab" data-tool="gemini">Gemini CLI</button>
        <button class="it-tab" data-tool="codex">Codex CLI</button>
      </div>

      <div class="it-panel" data-panel="cursor">
        <div class="it-meta">
          <span class="it-file-badge">📄 .cursor/mcp.json</span>
          <button class="it-copy" data-copy="cursor">복사</button>
        </div>
        <pre class="it-code" id="code-cursor">{`{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}`}</pre>
      </div>

      <div class="it-panel it-panel--hidden" data-panel="claude">
        <div class="it-meta">
          <span class="it-file-badge">📄 ~/Library/Application Support/Claude/claude_desktop_config.json</span>
          <button class="it-copy" data-copy="claude">복사</button>
        </div>
        <pre class="it-code" id="code-claude">{`{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}`}</pre>
      </div>

      <div class="it-panel it-panel--hidden" data-panel="gemini">
        <div class="it-meta">
          <span class="it-file-badge">📄 ~/.gemini/settings.json</span>
          <button class="it-copy" data-copy="gemini">복사</button>
        </div>
        <pre class="it-code" id="code-gemini">{`{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server@latest"],
      "env": {
        "ERDIFY_API_KEY": "erd_your_api_key_here"
      }
    }
  }
}`}</pre>
      </div>

      <div class="it-panel it-panel--hidden" data-panel="codex">
        <div class="it-meta">
          <span class="it-file-badge">📄 ~/.codex/config.yaml</span>
          <button class="it-copy" data-copy="codex">복사</button>
        </div>
        <pre class="it-code" id="code-codex">{`mcp_servers:
  erdify:
    command: npx
    args:
      - -y
      - "@erdify/mcp-server@latest"
    env:
      ERDIFY_API_KEY: erd_your_api_key_here`}</pre>
      </div>

      <div class="it-note">
        <span>🔑</span>
        <span>API 키는 ERDify 앱 <strong>설정 → API</strong>에서 발급받을 수 있습니다.</span>
        <a href={`${APP_URL}/register`} class="it-note-link">무료로 시작하기 →</a>
      </div>
    </div>
  </section>

  <!-- ── PRICING ── -->
  <section class="pricing" id="pricing">
    <div class="container">
      <div class="section-header">
        <div class="eyebrow">가격 정책</div>
        <h2>지금은 모든 기능이 무료</h2>
        <p>베타 서비스 기간 동안 제한 없이 사용하세요.</p>
      </div>
      <div class="plan-wrap">
        <div class="plan-card">
          <div class="plan-badge">베타 무료</div>
          <div class="plan-name">All-in</div>
          <div class="plan-price"><span class="price">₩0</span><span class="period">/ 베타 기간 동안</span></div>
          <p class="plan-desc">회원가입만 하면 모든 기능을 바로 사용할 수 있습니다.</p>
          <ul class="plan-feats">
            <li class="plan-feat--hl">🤖 ERDify AI (Claude · GPT-4o)</li>
            <li class="plan-feat--hl">🔌 MCP — Cursor · Claude · Gemini · Codex</li>
            <li class="plan-feat--hl">⚡ 실시간 팀 협업</li>
            <li>✓ 무제한 다이어그램</li>
            <li>✓ DDL 가져오기 / 내보내기</li>
            <li>✓ ORM 코드 생성 (TypeORM · Prisma · SQLAlchemy)</li>
            <li>✓ 공유 링크 · REST API · CLI</li>
          </ul>
          <a href={`${APP_URL}/register`} class="plan-cta">무료로 시작하기 →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CTA BANNER ── -->
  <section class="cta-banner">
    <div class="container">
      <h2>ERD를 AI로, 어디서든</h2>
      <p>베타 기간 동안 모든 기능을 무료로 — 지금 바로 시작하세요.</p>
      <a href={`${APP_URL}/register`} class="btn-primary btn-lg btn-white">무료로 시작하기 →</a>
    </div>
  </section>

  <!-- ── FOOTER ── -->
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="/" class="logo">
          <img src="/logo.svg" alt="ERDify" class="logo-image" style="filter: brightness(0) invert(1);" />
        </a>
        <p class="footer-tagline">AI와 함께하는<br/>실시간 협업 ERD 도구</p>
        <a href="mailto:cartoonpoet@gmail.com" class="footer-email">이메일 문의</a>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <span class="footer-col-title">제품</span>
          <a href="/#features">기능</a>
          <a href="/#integrations">AI 연동</a>
          <a href="/#pricing">가격</a>
          <a href={APP_URL}>앱 열기</a>
        </div>
        <div class="footer-col">
          <span class="footer-col-title">지원</span>
          <a href="/contact">문의하기</a>
          <a href="mailto:cartoonpoet@gmail.com">이메일 문의</a>
          <a href="/docs/">개발자 센터</a>
        </div>
        <div class="footer-col">
          <span class="footer-col-title">법적 고지</span>
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보처리방침</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <span>© 2026 ERDify. All rights reserved.</span>
        <div class="footer-bottom-links">
          <a href="/terms">이용약관</a>
          <a href="/privacy">개인정보처리방침</a>
          <a href="/contact">문의</a>
        </div>
      </div>
    </div>
  </footer>
</Layout>

<style>
  /* ── Variables (inherited from Layout global) ── */
  /* --primary: #0064e0  --primary-hover: #0052c2  --radius: 12px */
  /* --surface: #f8faff  --border: #e5e7eb  --text: #0f172a  --text-sub: #64748b */

  .container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

  /* ── Buttons ── */
  .btn-primary {
    background: var(--primary); color: #fff;
    border: none; border-radius: 10px;
    padding: 9px 18px; font-size: 14px; font-weight: 700;
    transition: background 0.15s; display: inline-block;
  }
  .btn-primary:hover { background: var(--primary-hover); }
  .btn-ghost {
    border: 1px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.8);
    border-radius: 10px; padding: 9px 18px;
    font-size: 14px; font-weight: 600;
    transition: border-color 0.15s; display: inline-block;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.4); }
  .btn-lg { padding: 14px 28px; font-size: 16px; }
  .btn-white { background: #fff; color: var(--primary); }
  .btn-white:hover { background: rgba(255,255,255,0.9); }

  /* ── Section Header ── */
  .section-header { text-align: center; margin-bottom: 52px; }
  .eyebrow {
    font-size: 11px; font-weight: 700; color: var(--primary);
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;
  }
  .section-header h2 {
    font-size: clamp(32px, 4vw, 44px); font-weight: 800;
    letter-spacing: -0.03em; margin-bottom: 14px; line-height: 1.1;
  }
  .section-header p { font-size: 17px; color: var(--text-sub); line-height: 1.7; }

  /* ── Hero ── */
  .hero {
    background: #0a0f1e;
    padding: 110px 0 96px;
    text-align: center;
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
    width: 800px; height: 500px;
    background: radial-gradient(ellipse, rgba(0,100,224,0.28) 0%, transparent 65%);
    pointer-events: none;
  }
  .hero::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent);
  }
  .hero-badge {
    position: relative;
    display: inline-block;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
    font-size: 11px; font-weight: 600;
    padding: 6px 16px; border-radius: 100px;
    margin-bottom: 28px; letter-spacing: 0.05em;
  }
  .hero-title {
    position: relative;
    font-size: clamp(52px, 8vw, 80px); font-weight: 900;
    line-height: 1.05; letter-spacing: -0.04em;
    color: #fff; margin-bottom: 8px;
  }
  .hl {
    background: linear-gradient(90deg, #60a5fa 0%, #818cf8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-sub {
    position: relative;
    font-size: 18px; color: rgba(255,255,255,0.45);
    margin: 16px auto 36px; line-height: 1.65;
    max-width: 480px;
  }
  .hero-actions {
    position: relative;
    display: flex; gap: 12px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 44px;
  }
  .hero-channels {
    position: relative;
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
  }
  .hc-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px; padding: 7px 16px;
    font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55);
  }

  /* ── ERDify AI ── */
  .ai-section { padding: 100px 0; background: var(--surface); }
  .ai-providers { display: flex; gap: 8px; justify-content: center; margin-bottom: 40px; flex-wrap: wrap; }
  .ai-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: #EEF4FF; border: 1px solid rgba(0,100,224,0.2);
    border-radius: 8px; padding: 7px 16px;
    font-size: 13px; font-weight: 600; color: #1d4ed8;
  }
  .ai-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
    max-width: 800px; margin: 0 auto;
  }
  .ai-card {
    background: var(--white, #fff); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 28px;
    transition: box-shadow 0.2s;
  }
  .ai-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.07); }
  .ai-card-icon { font-size: 28px; margin-bottom: 14px; }
  .ai-card h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
  .ai-card p { font-size: 14px; color: var(--text-sub); line-height: 1.65; }

  /* ── Channels ── */
  .channels-section { padding: 100px 0; }
  .ch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .ch-card {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 32px 20px; text-align: center;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .ch-card:hover { border-color: var(--primary); box-shadow: 0 4px 20px rgba(0,100,224,0.1); }
  .ch-card--accent {
    background: var(--primary); border-color: var(--primary); color: #fff;
  }
  .ch-card--accent p { color: rgba(255,255,255,0.75); }
  .ch-card--accent:hover { box-shadow: 0 8px 28px rgba(0,100,224,0.3); }
  .ch-icon { font-size: 32px; margin-bottom: 14px; }
  .ch-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
  .ch-card p { font-size: 13px; color: var(--text-sub); line-height: 1.6; }
  .ch-card code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }

  /* ── Core Features ── */
  .features-section { padding: 100px 0; background: var(--surface); }
  .feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .feat-card {
    background: var(--white, #fff); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 32px;
  }
  .feat-icon { font-size: 30px; margin-bottom: 14px; }
  .feat-card h3 { font-size: 19px; font-weight: 700; margin-bottom: 10px; }
  .feat-card p { font-size: 14px; color: var(--text-sub); line-height: 1.7; }

  /* ── MCP Integrations ── */
  .integrations { padding: 100px 0; }
  .it-tabs {
    display: flex; gap: 6px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
  }
  .it-tab {
    padding: 10px 20px; border: none; background: none;
    font-size: 13px; font-weight: 600; color: var(--text-sub);
    cursor: pointer; border-bottom: 2px solid transparent;
    margin-bottom: -1px; transition: color 0.15s, border-color 0.15s;
    font-family: var(--font, sans-serif);
  }
  .it-tab:hover { color: var(--text); }
  .it-tab--active { color: var(--primary); border-bottom-color: var(--primary); }
  .it-panel {
    background: #0f1923; border-radius: 0 0 12px 12px;
    overflow: hidden; border: 1px solid var(--border); border-top: none;
  }
  .it-panel--hidden { display: none; }
  .it-meta {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; background: #1a2733;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .it-file-badge { font-size: 11.5px; color: rgba(255,255,255,0.45); font-family: monospace; }
  .it-copy {
    font-size: 11px; font-weight: 600; padding: 4px 12px;
    border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);
    background: transparent; color: rgba(255,255,255,0.6);
    cursor: pointer; transition: all 0.15s; font-family: sans-serif;
  }
  .it-copy:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .it-copy--copied { border-color: #34d399; color: #34d399; }
  .it-code {
    margin: 0; padding: 24px 28px;
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px; line-height: 1.75; color: #e2e8f0;
    overflow-x: auto; white-space: pre;
  }
  .it-note {
    display: flex; align-items: center; gap: 8px;
    margin-top: 16px; padding: 12px 16px;
    background: #EEF4FF; border: 1px solid rgba(0,100,224,0.15);
    border-radius: 10px; font-size: 13px; color: var(--text);
  }
  .it-note-link {
    margin-left: auto; font-weight: 600; color: var(--primary);
    font-size: 13px; white-space: nowrap;
  }

  /* ── Pricing ── */
  .pricing { padding: 100px 0; background: var(--surface); }
  .plan-wrap { max-width: 500px; margin: 0 auto; }
  .plan-card {
    background: var(--white, #fff);
    border: 1.5px solid var(--primary); border-radius: 20px; padding: 40px;
    box-shadow: 0 0 0 4px rgba(0,100,224,0.07);
    position: relative; text-align: center;
  }
  .plan-badge {
    position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: var(--primary); color: #fff;
    font-size: 11px; font-weight: 700; padding: 4px 18px; border-radius: 100px;
  }
  .plan-name { font-size: 12px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.08em; }
  .plan-price { display: flex; align-items: baseline; gap: 6px; justify-content: center; margin: 10px 0 8px; }
  .price { font-size: 44px; font-weight: 900; letter-spacing: -0.03em; }
  .period { font-size: 14px; color: var(--text-sub); }
  .plan-desc { font-size: 14px; color: var(--text-sub); margin-bottom: 28px; }
  .plan-feats {
    list-style: none; text-align: left;
    display: flex; flex-direction: column; gap: 12px;
    margin-bottom: 32px; font-size: 14px; line-height: 1.5;
  }
  .plan-feat--hl { color: var(--primary); font-weight: 600; }
  .plan-cta {
    display: block; text-align: center;
    background: var(--primary); color: #fff;
    border-radius: 10px; padding: 15px;
    font-size: 15px; font-weight: 700;
    transition: background 0.15s;
  }
  .plan-cta:hover { background: var(--primary-hover); }

  /* ── CTA Banner ── */
  .cta-banner {
    padding: 100px 0; text-align: center;
    background: var(--primary);
    color: #fff;
  }
  .cta-banner h2 { font-size: clamp(32px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 14px; }
  .cta-banner p { font-size: 17px; opacity: 0.8; margin-bottom: 36px; }

  /* ── Footer ── */
  .footer { background: #0a0f1e; color: rgba(255,255,255,0.5); padding: 72px 0 0; }
  .footer-inner {
    display: flex; gap: 80px; padding-bottom: 56px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .footer-brand { flex: 1; min-width: 200px; }
  .footer-brand .logo { display: block; margin-bottom: 16px; }
  .footer-brand .logo img { width: 110px; height: auto; display: block; }
  .footer-tagline { font-size: 13px; line-height: 1.7; opacity: 0.45; margin-bottom: 14px; }
  .footer-email { font-size: 12px; color: rgba(255,255,255,0.4); text-decoration: none; transition: color .15s; font-family: monospace; }
  .footer-email:hover { color: rgba(255,255,255,0.8); }
  .footer-links { display: flex; gap: 56px; flex-wrap: wrap; }
  .footer-col { display: flex; flex-direction: column; gap: 12px; }
  .footer-col-title { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.28); text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 4px; }
  .footer-col a { font-size: 13.5px; color: rgba(255,255,255,0.45); transition: color 0.15s; }
  .footer-col a:hover { color: #fff; }
  .footer-bottom { padding: 20px 0; }
  .footer-bottom-inner { display: flex; justify-content: space-between; align-items: center; }
  .footer-bottom span { font-size: 12px; opacity: 0.28; }
  .footer-bottom-links { display: flex; gap: 20px; }
  .footer-bottom-links a { font-size: 12px; color: rgba(255,255,255,0.28); transition: color .15s; }
  .footer-bottom-links a:hover { color: rgba(255,255,255,0.6); }

  /* ── Responsive ── */
  @media (max-width: 1000px) {
    .ch-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 800px) {
    .ai-grid { grid-template-columns: 1fr; max-width: 480px; }
    .feat-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
    .footer-inner { flex-direction: column; gap: 32px; }
    .footer-links { flex-wrap: wrap; gap: 32px; }
    .hero { padding: 80px 0 64px; }
  }
  @media (max-width: 600px) {
    .ch-grid { grid-template-columns: 1fr; max-width: 360px; margin: 0 auto; }
    .hero-title { font-size: 44px; }
    .hero-sub { font-size: 16px; }
    .hero-sub br { display: none; }
    .cta-banner h2 { font-size: 28px; }
    .cta-banner p { font-size: 15px; }
    .ai-section, .channels-section, .features-section, .integrations, .pricing { padding: 72px 0; }
    .plan-card { padding: 32px 24px; }
  }
</style>

<script>
  // ── MCP 탭 ──
  const tabs = document.querySelectorAll<HTMLButtonElement>('.it-tab');
  const panels = document.querySelectorAll<HTMLElement>('.it-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tool = tab.dataset.tool!;
      tabs.forEach(t => t.classList.remove('it-tab--active'));
      panels.forEach(p => p.classList.add('it-panel--hidden'));
      tab.classList.add('it-tab--active');
      document.querySelector<HTMLElement>(`[data-panel="${tool}"]`)?.classList.remove('it-panel--hidden');
    });
  });

  // ── 클립보드 복사 ──
  function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.focus(); el.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(el); }
    return Promise.resolve();
  }

  document.querySelectorAll<HTMLButtonElement>('.it-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.copy!;
      const code = document.getElementById(`code-${key}`)?.textContent ?? '';
      copyText(code).then(() => {
        btn.textContent = '✓ 복사됨';
        btn.classList.add('it-copy--copied');
        setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('it-copy--copied'); }, 2000);
      });
    });
  });
</script>
```

- [ ] **Step 2: 로컬 확인**

```bash
cd apps/landing && pnpm dev
```

브라우저에서 `http://localhost:4321` 열어서 각 섹션 확인:
- Hero 다크 배경 + 그라디언트 타이틀
- ERDify AI 4-카드 그리드
- 4채널 카드 (ERDify AI 파란 accent)
- MCP 탭 클릭 동작
- 클립보드 복사 버튼 동작
- 반응형 (창 줄였을 때)

- [ ] **Step 3: 빌드 확인**

```bash
cd apps/landing && pnpm build
```

Expected: 에러 없이 `dist/` 생성

- [ ] **Step 4: 커밋 (사용자 허락 후)**

```bash
git add apps/landing/src/pages/index.astro
git commit -m "feat(landing): redesign with AI-first layout and dark hero"
```
