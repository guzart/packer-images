import * as fs from 'fs';
import * as path from 'path';

export const DIGITAL_OCEAN_BUILD = 'Build DigitalOcean snapshot';
export const VAGRANT_CLOUD_BUILD = 'Build Vagrant Cloud image';
export const VAGRANT_LOCAL_BUILD = 'Build Vagrant image';

export const log = (...messages: any[]) =>
  process.stdout.write(messages.map(v => v.toString()).join(' ') + '\n');

export const contains = (list: any[], value: any) => list.indexOf(value) !== -1;
const notContains = (list: any[], value: any) => list.indexOf(value) === -1;
const onlyDirectories = (fp: string) => fs.statSync(fp).isDirectory;
const appendPath = (p: string) => (fp: string) =>
  [p, fp].join('/').replace('//', '/');

export const extractImageName = (imagePath: string) => path.basename(imagePath);

export const hasAnsibleGalaxy = (imagePath: string) =>
  contains(getImageFiles(imagePath), 'ansible-galaxy.yml');

export const getAvailableImages = (imagesPath: string) =>
  fs
    .readdirSync(imagesPath)
    .map(appendPath(imagesPath))
    .filter(onlyDirectories)
    .map(fp => extractImageName(fp));

export const getImageFiles = (imagePath: string) =>
  fs
    .readdirSync(imagePath)
    .filter(fp => notContains(['.ds_store'], fp.toLocaleLowerCase()));

export const getImageActions = (imagePath: string) => {
  const availableActions = [];
  const imageFiles = getImageFiles(imagePath).map(n => n.toLocaleLowerCase());

  if (contains(imageFiles, 'digitalocean.json')) {
    availableActions.push(DIGITAL_OCEAN_BUILD);
  }

  if (contains(imageFiles, 'vagrantfile')) {
    availableActions.push(VAGRANT_CLOUD_BUILD);
    availableActions.push(VAGRANT_LOCAL_BUILD);
  }

  return availableActions;
};
