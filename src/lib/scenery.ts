import media from '../../source/media-library.json';
import art from '../../source/interface-art.json';
// Existing, attributed map images from the wiki. No generated scenery.
const names = ['Planet Namak','Snowy Town',"Marine's Ford",'Hollow World','Clover Kingdom','Undead Tomb','Hidden Sand Village','Ant Kingdom','Magic Town','Fabled Kingdom','Puppet Island','Windhym'];
export const scenery = [
  {label:'Alien Spaceship',image:art.spaceship.image},
  ...names.flatMap(label=>{
    const file=Object.values(media).find(file=>file.filename===`Map - ${label}.png`);
    return file ? [{label,image:file.url}] : [];
  }),
  {label:'Hero City (Midnight)',image:art.city.image},
  {label:'Virtual Dungeon',image:art.dungeon.image},
];
