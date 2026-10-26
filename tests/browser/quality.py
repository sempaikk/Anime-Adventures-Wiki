"""Regression checks against tests/helpers/browser-server.mjs, never a public service.
Requires Python Playwright and Chromium. Run with the isolated harness on port 4399.
"""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright,expect
BASE=os.environ.get('REVIEW_BASE','http://127.0.0.1:4399')
assert BASE.startswith('http://127.0.0.1:'), 'Use only an isolated local harness.'
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(os.environ.get('REVIEW_OUTPUT','/tmp/adventures-quality'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  for iteration in [1,2]:
   ctx=await browser.new_context(reduced_motion='reduce',viewport={'width':1680,'height':1000},extra_http_headers={'X-Review-User':'1'})
   page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   for locale in ['pt-br','en-us']:
    await page.goto(BASE+'/'+locale+'/personagens/',wait_until='networkidle')
    await expect(page.locator('#unit-results')).to_contain_text('personagens encontrados'if locale=='pt-br'else'characters found')
    await page.goto(BASE+'/'+locale+'/comparar/',wait_until='networkidle');assert '/'+locale+'/comparar/'in page.url
    await page.locator('[data-comparison-picker]').first.click();await page.locator('[data-picker-unit]:not(:disabled)').first.click();await page.wait_for_timeout(200)
    assert '/'+locale+'/comparar/?'in page.url
    await page.locator('[data-comparison-clear]').first.click()
    await page.goto(BASE+'/'+locale+'/artigo/iron-knight-arsenal-2259/',wait_until='networkidle')
    assert await page.locator('.stats-controls').count()==2
    assert await page.locator('.Stats-Box:visible').count()==1
    await expect(page.locator('.stats-controls label').first).to_have_text('Escolha a etapa do personagem'if locale=='pt-br'else'Select a character upgrade')
    await page.goto(BASE+'/'+locale+'/mapa/',wait_until='networkidle');await page.locator('[data-map-select]').first.click()
    await expect(page.locator('#map-point-description')).to_have_text('Local para obter novos personagens por invocação.'if locale=='pt-br'else'Place where you can buy new units.')
    await page.goto(BASE+'/'+locale+'/atualizacoes/',wait_until='networkidle');await expect(page.locator('#updates-site')).to_contain_text('Ainda não há atualizações publicadas.'if locale=='pt-br'else'No updates published yet.')
   await page.goto(BASE+'/pt-br/comunidade/',wait_until='networkidle');card=page.locator('.post-card').first
   assert await card.locator('.post-header>a').get_attribute('aria-label')
   await card.locator('summary').click();await page.locator('h1').click();assert await card.locator('.post-menu').get_attribute('open')is None
   await card.locator('summary').click();await page.keyboard.press('Escape');assert await card.locator('.post-menu').get_attribute('open')is None
   await card.locator('summary').click();await card.get_by_role('button',name='Editar publicação',exact=True).click()
   draft='[TESTE LOCAL] Edição preservada durante a falha '+str(iteration)
   await page.locator('.social-dialog textarea').fill(draft)
   async def reject(route):await route.fulfill(status=503,json={'error':'Falha temporária de teste.'})
   await page.route('**/api/community/posts/*',reject)
   await page.locator('.social-dialog').get_by_role('button',name='Salvar alterações').click()
   await expect(page.locator('.social-dialog [role=alert]')).to_have_text('Falha temporária de teste.')
   await expect(page.locator('.social-dialog textarea')).to_have_value(draft)
   await page.evaluate("document.documentElement.dataset.theme='light'");await page.wait_for_timeout(300)
   contrast=await page.locator('.social-dialog [role=alert]').evaluate(r"""e=>{const parse=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),l=a=>a.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0),a=l(parse(getComputedStyle(e).color)),b=l(parse(getComputedStyle(e.closest('dialog')).backgroundColor));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}""")
   assert contrast>=4.5,contrast
   await page.evaluate("document.documentElement.dataset.theme='adventures'");await page.wait_for_timeout(300)
   await page.unroute('**/api/community/posts/*',reject)
   await page.locator('.social-dialog').get_by_role('button',name='Salvar alterações').click();await expect(page.locator('.social-dialog')).to_have_count(0);await expect(card.locator('.post-body')).to_have_text(draft)
   # A failed profile lookup has an explicit retry and never pretends the user is signed out.
   await page.route('**/api/community/me',reject);await page.reload(wait_until='networkidle')
   await expect(page.locator('[data-feed-entry] strong')).to_have_text('Não foi possível carregar seu perfil.')
   await page.unroute('**/api/community/me',reject);await page.locator('[data-participation-retry]').click();await expect(page.locator('[data-post-form]')).to_be_visible()
   # Friendship actions and their confirmation describe the relationship accurately.
   await page.goto(BASE+'/pt-br/perfil/jogador-2/',wait_until='networkidle')
   await page.get_by_role('button',name='Adicionar amigo',exact=True).click()
   await expect(page.get_by_text('Solicitação enviada',exact=True)).to_be_visible()
   accepted=await page.request.patch(BASE+'/api/community/friends/jogador-1',headers={'X-Review-User':'2'},data={});assert accepted.ok
   await page.reload(wait_until='networkidle');await page.get_by_role('button',name='Remover amizade',exact=True).click()
   await expect(page.locator('.social-dialog')).to_contain_text('Esta pessoa será removida da sua lista de amigos.')
   await page.locator('.social-dialog').get_by_role('button',name='Remover',exact=True).click();await expect(page.get_by_role('button',name='Adicionar amigo',exact=True)).to_be_visible()
   # Upload responses may arrive in any order; the latest choice must win in both editors.
   images=['/art/wiki/f102544e2938b187aa4151be.webp','/art/originals/c6ff862c7a89360e79f63f07.webp']
   for kind,route,input_sel,preview_sel in [('profile','/pt-br/conta/','[data-profile-file=avatar]','[data-profile-avatar-preview]'),('article','/pt-br/artigo/iron-knight-arsenal-2259/#comentarios','.comment-composer [type=file]','.comment-composer .composer-preview')]:
    await page.goto(BASE+route,wait_until='networkidle')
    if kind=='article':await page.locator('[data-discussion]').scroll_into_view_if_needed()
    await page.locator(input_sel).wait_for();first=asyncio.Event();requests=[]
    async def upload(route):
     index=len(requests);requests.append(index)
     if index==0:first.set();await asyncio.sleep(.9)
     else:await asyncio.sleep(.02)
     await route.fulfill(status=201,json={'id':('a'if index==0 else'b')*32,'url':images[min(index,1)]})
    await page.route('**/api/community/media',upload)
    await page.locator(input_sel).set_input_files(str(ROOT/'public'/images[0].lstrip('/')));await asyncio.wait_for(first.wait(),10)
    await page.locator(input_sel).set_input_files(str(ROOT/'public'/images[1].lstrip('/')));await asyncio.sleep(1.3)
    assert await page.locator(preview_sel).get_attribute('src')==images[1]
    await page.unroute('**/api/community/media',upload)
   # Successful deletion restores focus to the remaining feed, not BODY.
   response=await page.request.post(BASE+'/api/community/posts',data={'body':'[TESTE LOCAL] Excluir para conferir o foco.'});post=(await response.json())['post']
   await page.goto(BASE+'/pt-br/comunidade/',wait_until='networkidle');target=page.locator('[data-post-id="'+post['id']+'"]');await target.locator('summary').click();await target.get_by_role('button',name='Excluir publicação',exact=True).click();await page.locator('.social-dialog').get_by_role('button',name='Excluir',exact=True).click();await target.wait_for(state='detached');await page.wait_for_timeout(200)
   assert await page.evaluate('document.activeElement.tagName')!='BODY'
   # Reported photo is visible in moderator review.
   photo=(await (await page.request.get(BASE+'/api/community/posts?feed=all')).json())['posts'][0]
   await page.request.post(BASE+'/api/community/posts/'+photo['id']+'/report',data={'reason':'[TESTE LOCAL] Conferir foto na revisão.'})
   admin=await browser.new_context(reduced_motion='reduce',extra_http_headers={'X-Review-User':'0'});ap=await admin.new_page();await ap.goto(BASE+'/pt-br/comunidade/',wait_until='networkidle');await ap.locator('[data-post-moderation] summary').click();await expect(ap.locator('.report-photo')).to_be_visible();await ap.goto(BASE+'/pt-br/revisao/',wait_until='networkidle');await ap.wait_for_selector('[data-note-article] option:nth-child(2)',state='attached');assert not await ap.locator('[data-note-article]').evaluate('e=>e.checkValidity()');await admin.close()
   checks.append({'pass':iteration,'flows':'languages, stats, map, updates, menus, failed edit/retry, profile retry, upload order, deletion focus, moderation photo, required selection'})
   await ctx.close()
   guest=await browser.new_context(reduced_motion='reduce');gp=await guest.new_page();await gp.add_init_script("localStorage.setItem('aa-favorites',JSON.stringify(['iron-knight-arsenal-2259']))")
   await gp.goto(BASE+'/pt-br/favoritos/',wait_until='networkidle');await expect(gp.locator('#favorite-grid .library-card-copy p').first).to_contain_text('é uma unidade');await guest.close()
  # Responsive layout and typography after asynchronous fonts and theme transitions settle.
  ctx=await browser.new_context(reduced_motion='reduce');page=await ctx.new_page()
  pages=['/','/comunidade/','/personagens/','/biblioteca/','/artigo/iron-knight-arsenal-2259/','/mapa/','/conta/','/perfil/jogador-2/','/pessoas/','/favoritos/','/comparar/','/atualizacoes/','/sobre/','/revisao/','/404.html']
  for route in pages:
   await page.goto(BASE+'/pt-br'+route,wait_until='networkidle')
   for theme in ['adventures','dark','light']:
    await page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
    for width in [320,390,768,1440,1920]:
     await page.set_viewport_size({'width':width,'height':950});await page.wait_for_timeout(300)
     assert await page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),(route,theme,width)
     if width==1920:
      assert await page.locator('.site-footer').evaluate('e=>Math.abs(e.getBoundingClientRect().right-document.body.clientWidth)<2'),(route,'footer width')
     checks.append({'page':route,'theme':theme,'width':width})
   if route=='/personagens/':
    await page.set_viewport_size({'width':320,'height':950});await page.wait_for_timeout(300)
    assert await page.evaluate('''()=>[...document.querySelectorAll('[data-unit-card]:not([hidden])')].every(e=>Math.abs(e.getBoundingClientRect().bottom-e.querySelector('.unit-card-actions').getBoundingClientRect().bottom)<3)''')
  await ctx.close()
  nojs=await browser.new_context(java_script_enabled=False);fallback=await nojs.new_page()
  for route,notice in [('/en-us/comunidade/','Enable JavaScript to view community posts.'),('/en-us/artigo/iron-knight-arsenal-2259/','Enable JavaScript to read and post comments.')]:
   await fallback.goto(BASE+route,wait_until='networkidle');await expect(fallback.locator('noscript p').filter(has_text=notice)).to_contain_text(notice);await expect(fallback.locator('noscript p').filter(has_text=notice)).to_be_visible()
  await nojs.close();await browser.close()
 assert not errors,errors
 (OUT/'results.json').write_text(json.dumps({'checks':checks,'browser_errors':errors},ensure_ascii=False,indent=2))
 print('PASS:',len(checks),'flow/layout checks; no unhandled browser errors.')
asyncio.run(main())
