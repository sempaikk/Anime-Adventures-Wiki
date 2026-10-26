"""Behavioral checks for the redesign; isolated localhost fixtures only."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright,expect
BASE=os.environ.get('REVIEW_BASE','http://127.0.0.1:4402')
assert BASE.startswith('http://127.0.0.1:'),'Local isolated harness required.'
OUT=Path(os.environ.get('REVIEW_OUTPUT','/tmp/adventures-redesign'));OUT.mkdir(parents=True,exist_ok=True)
ARTICLE='iron-knight-arsenal-2259'
async def main():
 errors=[];checks=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  guest=await browser.new_context(reduced_motion='reduce',viewport={'width':1440,'height':1000})
  page=await guest.new_page();page.on('pageerror',lambda e,active=page:errors.append({'url':active.url,'message':str(e),'stack':e.stack}))
  await page.goto(BASE+'/pt-br/',wait_until='networkidle')
  assert await page.locator('.orbit-brand').evaluate('e=>e.clientHeight<=document.querySelector(".site-header").clientHeight')
  scenes=await page.locator('[data-decorative-scene]').evaluate_all('nodes=>nodes.map(n=>n.src)');assert len(scenes)==len(set(scenes))==2
  await page.locator('#discover-query').fill('Iron Knight');await page.locator('#discover-query').press('Enter')
  await expect(page).to_have_url(BASE+'/pt-br/biblioteca/?q=Iron+Knight')
  await expect(page.locator('#article-search')).to_have_value('Iron Knight')
  await page.goto(BASE+'/pt-br/personagens/',wait_until='networkidle')
  await page.locator('#load-units').click();assert await page.locator('[data-unit-card]:visible').count()==24
  await page.locator('.unit-card:visible').first.click();await page.wait_for_url('**/artigo/**')
  await page.go_back(wait_until='networkidle');assert await page.locator('[data-unit-card]:visible').count()==24
  await page.goto(BASE+'/pt-br/artigo/'+ARTICLE+'/',wait_until='networkidle')
  assert await page.locator('meta[property="og:image"]').get_attribute('content')!=await page.evaluate('location.origin')
  await expect(page.locator('.article-source-link')).to_contain_text('Revisão')
  await page.goto(BASE+'/en-us/',wait_until='networkidle');await expect(page.locator('[data-recent-articles]')).to_be_visible()
  await expect(page.locator('[data-recent-articles] a').first).to_have_attribute('href','/en-us/artigo/'+ARTICLE+'/')
  await page.locator('[data-clear-recent]').click();await expect(page.locator('[data-recent-articles]')).to_be_hidden()
  for width in [320,390,768]:
   await page.set_viewport_size({'width':width,'height':900});await page.goto(BASE+'/pt-br/',wait_until='networkidle')
   r=await page.locator('.mobile-primary').evaluate('e=>({top:e.getBoundingClientRect().top,bottom:document.querySelector(".site-header").getBoundingClientRect().bottom})')
   assert abs(r['top']-r['bottom'])<2,r
   assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2')
  checks.append('search, article metadata, navigation context, local recents, mobile navigation, distinct decorative scenes')
  await guest.close()
  ctx=await browser.new_context(reduced_motion='reduce',viewport={'width':1440,'height':1000},extra_http_headers={'X-Review-User':'1'})
  page=await ctx.new_page();page.on('pageerror',lambda e,active=page:errors.append({'url':active.url,'message':str(e),'stack':e.stack}))
  await page.goto(BASE+'/pt-br/comunidade/',wait_until='networkidle')
  await page.locator('#post-body').fill('[TESTE LOCAL] Rascunho com acentos e nome de personagem.')
  await page.reload(wait_until='networkidle');await expect(page.locator('#post-body')).to_have_value('[TESTE LOCAL] Rascunho com acentos e nome de personagem.')
  await ctx.set_extra_http_headers({'X-Review-User':'2'});await page.reload(wait_until='networkidle');await expect(page.locator('#post-body')).to_have_value('')
  await ctx.set_extra_http_headers({'X-Review-User':'1'});await page.reload(wait_until='networkidle')
  await expect(page.locator('#post-body')).to_have_value('[TESTE LOCAL] Rascunho com acentos e nome de personagem.')
  await page.locator('#post-topic').fill('Iron Knight (Arsenal)');await page.locator('[data-post-form] button[type=submit]').click()
  await expect(page.locator('[data-composer-status]')).to_have_text('Publicação enviada.')
  await expect(page.locator('.post-card').first.locator('.post-topic')).to_contain_text('Iron Knight (Arsenal)')
  await expect(page.locator('#post-body')).to_have_value('')
  await page.reload(wait_until='networkidle');await expect(page.locator('#post-body')).to_have_value('')
  photo=page.locator('img.post-photo').first;await photo.focus();await photo.press('Enter');await expect(page.locator('.photo-viewer')).to_be_visible()
  await page.keyboard.press('Escape');await expect(page.locator('.photo-viewer')).not_to_be_visible();await expect(photo).to_be_focused()
  await page.goto(BASE+'/en-us/comunidade/?artigo='+ARTICLE,wait_until='networkidle')
  await expect(page.locator('[data-feed-topic]')).to_contain_text('Posts about:')
  await expect(page.locator('.post-card .post-topic')).to_contain_text('Iron Knight (Arsenal)')
  await expect(page.locator('[data-post-form] .topic-picker')).to_contain_text('Link to an article')
  await page.goto(BASE+'/pt-br/artigo/'+ARTICLE+'/',wait_until='networkidle')
  await page.locator('#article-community').scroll_into_view_if_needed();await expect(page.locator('#article-community .post-card')).to_have_count(1)
  await page.locator('[data-discussion]').scroll_into_view_if_needed();await page.wait_for_selector('.comment-composer textarea')
  await page.locator('.comment-composer textarea').first.fill('[TESTE LOCAL] Comentário recuperável.')
  await page.reload(wait_until='networkidle');await page.locator('[data-discussion]').scroll_into_view_if_needed();await expect(page.locator('.comment-composer textarea').first).to_have_value('[TESTE LOCAL] Comentário recuperável.')
  checks.append('account-scoped tab drafts, publishing clears drafts, optional article association, related feed, accessible full-photo viewer, comment recovery')
  # Images are intentionally lazy. Scroll before taking a full-page review capture.
  for route,name in [('/','home'),('/comunidade/','community'),('/artigo/'+ARTICLE+'/','article')]:
   for theme in ['adventures','dark','light']:
    for width in [390,1440]:
     await page.set_viewport_size({'width':width,'height':1000})
     await page.goto(BASE+'/pt-br'+route,wait_until='networkidle');await page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
     await page.evaluate('document.fonts.ready');await page.evaluate('window.scrollTo(0,document.body.scrollHeight)');await page.wait_for_timeout(500);await page.evaluate('window.scrollTo(0,0)');await page.wait_for_timeout(300)
     assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),(route,theme,width)
     await page.screenshot(path=str(OUT/f'{name}-{theme}-{width}.png'),full_page=True)
  await ctx.close()
  motion=await browser.new_context(reduced_motion='no-preference',viewport={'width':1440,'height':1000})
  mp=await motion.new_page();mp.on('pageerror',lambda e,active=mp:errors.append({'url':active.url,'message':str(e),'stack':e.stack}))
  await mp.goto(BASE+'/pt-br/personagens/',wait_until='networkidle');await mp.locator('.unit-card:visible').first.click();await mp.wait_for_url('**/artigo/**');await expect(mp.locator('.classic-article-heading')).to_be_visible()
  await mp.go_back(wait_until='networkidle');await expect(mp.locator('#unit-grid')).to_be_visible()
  await mp.evaluate("localStorage.setItem('aa-motion','off')");await mp.reload(wait_until='networkidle')
  await mp.locator('.unit-card:visible').first.click();await mp.wait_for_url('**/artigo/**');await expect(mp.locator('.classic-article-heading')).to_be_visible()
  await mp.wait_for_timeout(400)
  checks.append('navigation with motion enabled, disabled and browser-native transition support')
  await motion.close();await browser.close()
 assert not errors,errors
 (OUT/'results.json').write_text(json.dumps({'flows':checks,'screenshots':18,'browser_errors':errors},indent=2))
 print('PASS: redesign flows and 18 review captures; no unhandled browser errors.')
asyncio.run(main())
