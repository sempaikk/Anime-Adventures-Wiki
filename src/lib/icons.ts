export const iconPaths: Record<string, string> = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  external: 'M7 17 17 7M7 7h10v10',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 7h16M4 12h11M4 17h16',
  person: 'M19 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  people: 'M16 21v-2a6 6 0 0 0-12 0v2M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 21v-2a6 6 0 0 0-3-5M18 3a4 4 0 0 1 0 8',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
  book: 'M12 5C8 2 5 3 2 4v15c3-1 6-2 10 1m0-15c4-3 7-2 10-1v15c-3-1-6-2-10 1V5',
  compare: 'M8 3v18M16 3v18M4 7h8m0 10h8',
  settings: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  photo: 'M21 15l-5-5L5 21M3 16l5-5 4 4M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m4 4h.01',
  message: 'M21 11a9 9 0 0 1-9 9H3l1.5-4.5A9 9 0 1 1 21 11M8 10h8m-8 4h5',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  up: 'M12 20V4m-6 6 6-6 6 6',
  grid: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  compass: 'm16 8-3 5-5 3 3-5 5-3M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
export function icon(name: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({width:'20',height:'20',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.65','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key,value);
  const path=document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('d', iconPaths[name] || iconPaths.arrow);svg.append(path);
  return svg;
}
