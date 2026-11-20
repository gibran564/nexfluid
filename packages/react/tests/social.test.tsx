import { act, useState } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NexAvatar, NexMenu, NexTextarea, avatarInitials, avatarTone, type NexMenuItem } from '@nexfluid/react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
async function violations() {
  const r = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('NexAvatar', () => {
  it('iniciales por grafemas: dos palabras, acentos y emoji no se parten', () => {
    expect(avatarInitials('María José de la Cruz')).toBe('MC');
    expect(avatarInitials('ángel')).toBe('Á');
    expect(avatarInitials('  ')).toBe('');
    expect(avatarInitials('王秀英')).toBe('王');
    expect(avatarInitials('Ana — López')).toBe('AL');
  });

  it('el tono es estable y sólo usa parejas de tokens conocidas', () => {
    expect(avatarTone('Ana López')).toBe(avatarTone('ana lópez'));
    for (const name of ['A', 'Beto', 'Carla Ruiz', '王秀英', 'Jo']) expect(['accent', 'success', 'warning', 'neutral']).toContain(avatarTone(name));
  });

  it('decorativo por defecto; anunciado con decorative={false}', async () => {
    act(() => root.render(<><NexAvatar name="Ana López" /><span>Ana López</span><NexAvatar name="Beto" decorative={false} /></>));
    const [quiet, loud] = container.querySelectorAll('.nx-avatar');
    expect(quiet!.getAttribute('aria-hidden')).toBe('true');
    expect(loud!.getAttribute('role')).toBe('img');
    expect(loud!.getAttribute('aria-label')).toBe('Beto');
    expect(await violations()).toEqual([]);
  });

  it('una imagen que falla vuelve a las iniciales; otra URL vuelve a intentarlo', () => {
    const { rerender } = { rerender: (src: string) => act(() => root.render(<NexAvatar name="Ana López" src={src} size="large" />)) };
    rerender('https://example.test/a.png');
    const img = $<HTMLImageElement>('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('width')).toBe('48');
    act(() => { img.dispatchEvent(new Event('error')); });
    expect(container.querySelector('img')).toBeNull();
    expect($('.nx-avatar__initials').textContent).toBe('AL');
    expect($('.nx-avatar').dataset.nxTone).toBe(avatarTone('Ana López'));
    rerender('https://example.test/b.png');
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('forma y tamaño en px', () => {
    act(() => root.render(<NexAvatar name="Curso" shape="membrane" size={60} />));
    expect($('.nx-avatar').dataset.nxShape).toBe('membrane');
    expect($('.nx-avatar').style.getPropertyValue('--nx-avatar-size')).toBe('60px');
  });

  it('SSR e hidratación sin diferencias', () => {
    const html = renderToString(<NexAvatar name="Ana López" src={null} />);
    expect(html).toContain('AL');
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let hydrated!: Root;
    act(() => { hydrated = hydrateRoot(host, <NexAvatar name="Ana López" src={null} />); });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    act(() => hydrated.unmount());
    host.remove();
  });
});

describe('NexTextarea', () => {
  it('etiqueta, ayuda, error y pie dentro de la membrana', async () => {
    act(() => root.render(<NexTextarea label="Comentario" description="Sé amable" error="Vacío" footer={<button type="button">Enviar</button>} defaultValue="" />));
    const area = $<HTMLTextAreaElement>('textarea');
    expect(area.labels?.[0]?.textContent).toBe('Comentario');
    expect(area.getAttribute('aria-invalid')).toBe('true');
    expect(area.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)!.textContent)).toEqual(['Sé amable', 'Vacío']);
    expect(area.closest('.nx-input')!.querySelector('.nx-input__footer button')!.textContent).toBe('Enviar');
    expect(area.rows).toBe(3);
    expect(await violations()).toEqual([]);
  });

  it('controlado: crece con el valor y respeta el tope de líneas', () => {
    // jsdom no maqueta: se simula la altura de contenido para probar la regla.
    const proto = HTMLTextAreaElement.prototype;
    const original = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
    Object.defineProperty(proto, 'scrollHeight', { configurable: true, get(this: HTMLTextAreaElement) { return this.value.split('\n').length * 24; } });
    try {
      function Host() {
        const [v, setV] = useState('');
        return <NexTextarea label="Texto" value={v} onChange={(e) => setV(e.target.value)} minRows={2} maxRows={4} style={{ lineHeight: '24px' }} />;
      }
      act(() => root.render(<Host />));
      const area = $<HTMLTextAreaElement>('textarea');
      expect(area.style.height).toBe('48px');
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      act(() => { setter.call(area, 'a\nb\nc'); area.dispatchEvent(new Event('input', { bubbles: true })); });
      expect(area.style.height).toBe('72px');
      act(() => { setter.call(area, '1\n2\n3\n4\n5\n6\n7'); area.dispatchEvent(new Event('input', { bubbles: true })); });
      expect(area.style.height).toBe('96px');
      expect(area.style.overflowY).toBe('auto');
    } finally {
      if (original) Object.defineProperty(proto, 'scrollHeight', original);
    }
  });

  it('reenvía la ref y los atributos nativos', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    act(() => root.render(<NexTextarea ref={ref} label="Notas" maxLength={10} placeholder="Escribe" required />));
    expect(ref.current).toBe($('textarea'));
    expect(ref.current!.maxLength).toBe(10);
    expect(ref.current!.required).toBe(true);
  });
});

describe('NexMenu · selection y description', () => {
  const reactions = (log: string[], mine: string | null): NexMenuItem[] => [
    { id: 'like', label: 'Me gusta', icon: <span>👍</span>, checked: mine === 'like', onSelect: () => log.push('like') },
    { id: 'idea', label: 'Buena idea', icon: <span>💡</span>, checked: mine === 'idea', onSelect: () => log.push('idea') },
    { id: 'wow', label: 'Sorprendente', icon: <span>😮</span>, group: 'Más', checked: mine === 'wow', onSelect: () => log.push('wow') },
  ];

  it('single: menuitemradio, conserva el icono y marca la elegida al final', async () => {
    const log: string[] = [];
    act(() => root.render(<NexMenu label="Reaccionar" selection="single" items={reactions(log, 'idea')}>Reaccionar</NexMenu>));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    const radios = [...container.querySelectorAll('[role="menuitemradio"]')];
    expect(radios).toHaveLength(3);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios[1]!.querySelector('.nx-menu__icon')!.textContent).toBe('💡');
    expect(radios[1]!.querySelector('.nx-menu__check')).not.toBeNull();
    expect(radios[0]!.querySelector('.nx-menu__check')).toBeNull();
    expect(container.querySelector('[role="menuitemcheckbox"]')).toBeNull();
    expect(await violations()).toEqual([]);
    key(document.activeElement!, 'ArrowDown');
    key(document.activeElement!, 'Enter');
    expect(log).toEqual(['idea']);
    expect(document.activeElement).toBe($('.nx-menu__trigger'));
  });

  it('multiple (por defecto) no cambia: menuitemcheckbox con la marca en el icono', () => {
    act(() => root.render(<NexMenu label="Vista" items={[{ id: 'w', label: 'Salida amplia', icon: <span>W</span>, checked: true, onSelect: () => {} }]} />));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    const item = $('[role="menuitemcheckbox"]');
    expect(item.querySelector('.nx-menu__icon [data-nx-icon="check"]')).not.toBeNull();
    expect(item.querySelector('.nx-menu__icon')!.textContent).not.toContain('W');
    expect(item.querySelector('.nx-menu__check')).toBeNull();
  });

  it('description: segunda línea unida con aria-describedby', async () => {
    act(() => root.render(<NexMenu label="Más formas de compartir" items={[
      { id: 'prompt', label: 'Prompt', description: 'Una instrucción para IA, reutilizable', onSelect: () => {} },
      { id: 'page', label: 'Página web', onSelect: () => {} },
    ]}>Más</NexMenu>));
    act(() => $<HTMLButtonElement>('.nx-menu__trigger').click());
    const [prompt, page] = container.querySelectorAll('[role="menuitem"]');
    const described = prompt!.getAttribute('aria-describedby')!;
    expect(document.getElementById(described)!.textContent).toBe('Una instrucción para IA, reutilizable');
    expect(page!.hasAttribute('aria-describedby')).toBe(false);
    expect(await violations()).toEqual([]);
  });
});
