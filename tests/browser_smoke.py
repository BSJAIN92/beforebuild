"""Standalone UI smoke test. Requires Python Playwright and a Chromium executable.
Uses page.set_content only: no hosted app, auth service, database or AI calls.
BROWSER_EXECUTABLE can point to a local Chromium; omit to use Playwright's browser.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'qa'
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'dist' / 'beforebuild-demo.html').read_text()
results = []
errors = []
requests = []

def check(name, condition):
    assert condition, name
    results.append(name)

with sync_playwright() as p:
    executable = os.getenv('BROWSER_EXECUTABLE')
    browser = p.chromium.launch(headless=True, **({'executable_path': executable} if executable else {}))
    context = browser.new_context(viewport={'width':1440, 'height':1100}, accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(5000)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    # The injected in-memory Storage API is only a browser-test fixture. It is
    # not a test of browser disk persistence (covered separately as domain mocks).
    page.evaluate("""() => { const store = new Map(); Object.defineProperty(window, 'localStorage', { value: {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k)} }); }""")
    page.set_content(HTML, wait_until='domcontentloaded')
    check('Home has exactly three tier choices', page.locator('.tier-card').count() == 3)
    page.screenshot(path=str(OUT / 'home-desktop.png'), full_page=True)
    page.locator('[data-action="sample"]').click()
    check('Sample opens a traditional nine-block canvas', page.locator('.canvas-block').count() == 9)
    page.screenshot(path=str(OUT / 'workspace-desktop.png'), full_page=True)
    # Manual edit and rename, then continue the interview.
    page.locator('[data-action="edit-block"][data-block="value"]').click()
    page.locator('#editor-rows textarea').first.fill('Less awkward invoice follow-up for independent designers.')
    page.locator('#edit-block-form button[type="submit"]').click()
    check('Manual edit is visible immediately', 'Less awkward invoice follow-up' in page.locator('.block-value').inner_text())
    page.locator('[data-action="rename"]').click()
    page.locator('#idea-name').fill('Nudge — designer edition')
    page.locator('#rename-form button[type="submit"]').click()
    check('Renamed idea appears in workspace', 'designer edition' in page.locator('.editable-title').inner_text())
    # Sample starts with two saved answers. Three more finish Basic.
    for answer in ['A small monthly fee after a paid pilot.', 'My freelance design community.', 'Ten hours a week and a small hosting budget.']:
        page.locator('#chat-input').fill(answer)
        page.locator('#chat-form button[type="submit"]').click()
        page.wait_for_timeout(520)
    check('Basic conversation completes with all nine populated sections', page.locator('.canvas-block.has-content').count() == 9 and page.locator('.complete-note').count() == 1)
    check('Founder edit survives subsequent turns', 'Less awkward invoice follow-up' in page.locator('.block-value').inner_text())
    page.locator('[data-action="tab"][data-tab="assumptions"]').click()
    page.locator('[data-action="decide"][data-decision="decline"]').first.click()
    check('Founder can disagree with an assumption', 'Your decision is saved' in page.locator('.toast').inner_text())
    page.locator('[data-action="tab"][data-tab="validation"]').click()
    check('Validation plan has three actionable experiments', page.locator('.experiment-card').count() == 3)
    page.locator('[data-action="experiment"]').first.click()
    check('Completed experiment is saved', '1 of 3' in page.locator('.validation-progress').inner_text())
    # Both download paths, inspect actual bytes.
    page.locator('[data-action="export"]').click()
    for action, suffix in [('export-json', '.json'), ('export-md', '.md')]:
        with page.expect_download() as info:
            page.locator('[data-action="'+action+'"]').click()
        download = info.value
        path = OUT / ('export' + suffix)
        download.save_as(str(path))
        content = path.read_text()
        check('Download ' + suffix + ' contains actual saved content', 'Less awkward invoice follow-up' in content and 'Validation' in content if suffix == '.md' else json.loads(content)['idea']['title'] == 'Nudge — designer edition')
    page.locator('dialog [data-action="close-dialog"]').click()
    # Upgrade keeps the same record and previous work.
    page.locator('[data-action="upgrade"]').first.click()
    page.locator('#upgrade-consent').check()
    page.locator('#upgrade-form button[type="submit"]').click()
    check('Intermediate upgrade keeps the idea name', 'designer edition' in page.locator('.editable-title').inner_text())
    page.locator('[data-action="unsure"]').click()
    page.wait_for_timeout(520)
    page.locator('[data-action="tab"][data-tab="research"]').click()
    check('Demo research cannot be mistaken for actual findings', 'Demo only — no live searches' in page.locator('.research-report').inner_text())
    # Keyboard navigation, source-safe canvas edit, and mobile breakpoints.
    page.locator('#tab-canvas').click()
    page.locator('#tab-canvas').focus()
    page.keyboard.press('ArrowRight')
    check('Keyboard arrow navigates output tabs', page.locator('#tab-assumptions').get_attribute('aria-selected') == 'true')
    page.locator('#tab-canvas').click()
    page.locator('.block-costs').focus()
    page.keyboard.press('Enter')
    check('Canvas is keyboard-editable', page.locator('dialog[open] #edit-block-form').count() == 1)
    page.keyboard.press('Escape')
    for width in [390, 320]:
        page.set_viewport_size({'width':width, 'height':844})
        check(f'{width}px viewport has no body overflow', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        page.locator('[data-action="mobile-view"][data-view="canvas"]').click()
        check(f'{width}px mobile canvas switch works', page.locator('.output-panel').is_visible())
        check(f'{width}px canvas overflow is contained', page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        if width == 390:
            page.screenshot(path=str(OUT / 'workspace-mobile.png'), full_page=True)
        page.locator('[data-action="mobile-view"][data-view="chat"]').click()
        check(f'{width}px mobile conversation switch works', page.locator('.chat-panel').is_visible())
    page.set_viewport_size({'width':1440, 'height':1100})
    page.locator('[data-action="settings"]').click()
    page.locator('#invite-form input').fill('test-founder@example.com')
    page.locator('#invite-form button[type="submit"]').click()
    check('Admin can add a demo allowlist entry', page.locator('[data-action="invite-toggle"][data-email="test-founder@example.com"]').count() == 1)
    page.locator('[data-action="invite-toggle"][data-email="test-founder@example.com"]').click()
    check('Admin can revoke a demo allowlist entry', page.locator('[data-action="invite-toggle"][data-email="test-founder@example.com"]').get_attribute('data-active') == 'true')
    page.locator('#price-intermediate').fill('19')
    page.locator('#price-advanced').fill('49')
    page.locator('#pricing-form button[type="submit"]').click()
    check('Prices save without activating billing', 'Billing remains disabled' in page.locator('.toast').inner_text())
    page.locator('[data-action="ideas"]').click()
    page.locator('#idea-search').fill('no match exists')
    check('Library search filters ideas', page.locator('.library-grid .idea-card:visible').count() == 0)
    page.locator('#idea-search').fill('Nudge')
    check('Library search restores matching ideas', page.locator('.library-grid .idea-card:visible').count() == 1)
    # New raw idea from scratch and early completion.
    page.locator('[data-action="new"]').first.click()
    page.locator('#raw-idea').fill('A booking reminder service for independent neighborhood tutors.')
    page.locator('[data-action="tier"][data-tier="basic"]').click()
    page.locator('#new-idea-form button[type="submit"]').click()
    check('Raw idea creates an empty canvas and first question', page.locator('.canvas-block.has-content').count() == 0 and page.locator('#chat-input').count() == 1)
    page.locator('[data-action="finish"]').first.click()
    page.locator('[data-action="confirm-finish"]').click()
    page.wait_for_timeout(520)
    check('Explicit early draft creates all nine sections', page.locator('.canvas-block.has-content').count() == 9)
    page.locator('[data-action="ideas"]').click()
    check('Multiple separate saved ideas are supported', page.locator('.library-grid .idea-card').count() == 2)
    page.locator('[data-action="delete"]').first.click()
    page.locator('[data-action="confirm-delete"]').click()
    check('Delete removes only the chosen idea', page.locator('.library-grid .idea-card').count() == 1)
    check('No unhandled browser JavaScript errors', not errors)
    check('Standalone demo made zero network requests', not requests)
    browser.close()

report = {'checks_passed':len(results), 'checks':results, 'page_errors':errors, 'network_requests':requests, 'scope':'Standalone UI only; mocked browser storage. No live service integration tested.'}
(OUT / 'browser-results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
