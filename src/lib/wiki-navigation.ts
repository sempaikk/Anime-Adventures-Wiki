import registry from '../../source/wiki-navigation.json';
import { articleUrl } from './wiki';
const entries = [
  ['units','Units','Personagens','Unit List','#fffb00','#ffa400'],
  ['items','Items','Itens','Items','#54ff7d','#02ff03'],
  ['traits','Traits','Traits','Traits','#ffd300','#e72e20'],
  ['codes','Codes','Códigos','Codes','#20ffed','#5498ff'],
  ['effects','Effects','Efeitos','Effects','#ff3232','#b10606'],
  ['relics','Relics','Relíquias','Relics','#fd00f9','#453b9f'],
  ['powerups','Powerups','Powerups','Powerups','#a6b9ff','#5d3e8c'],
  ['evolution','Evolution','Evoluções','Evolution','#92fe55','#00fd9e'],
  ['cosmetics','Cosmetics','Cosméticos','Cosmetics','#fdd700','#fe9455'],
  ['tiers','Tier Lists','Tier lists','Tier Lists','#00deff','#926af1'],
  ['battlepass','Battlepass','Passe de batalha','Battlepass','#55dfff','#7300ff'],
  ['values','Value List','Lista de valores','Value List','#00deff','#926af1'],
  ['contracts','Contracts','Contratos','Contracts','#ffcc00','#ff6600'],
];
export const gameNavigation = entries.map(([key,label,accessible,title,color,secondary]) => ({
  key,label,accessible,title,color,secondary,href:articleUrl(title),
  icon:registry.icons.find(icon=>icon.key===key)!,
}));
export const gameLogo = '/art/wiki/f5ef0f1c351dd69e070f9eef.webp';
