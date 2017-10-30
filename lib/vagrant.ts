import chalk from 'chalk';
import { execSync } from 'child_process';

import * as ansible from './ansible';
import * as utils from './utils';

const log = (...info: any[]) => utils.log(chalk.green(...info));

interface CleanupOptions {
  box: boolean;
}

export const cleanup = (
  imagePath: string,
  options: CleanupOptions = { box: true }
) => {
  const imageName = utils.extractImageName(imagePath);

  const cwd = imagePath;
  log('Cleaning up vagrant files...');
  execSync('vagrant destroy -f', { cwd, stdio: 'inherit' });
  execSync('rm -rf .vagrant', { cwd, stdio: 'inherit' });
  if (options.box) {
    execSync(`[ ! -e ${imageName}.box ] || rm ${imageName}.box`, {
      cwd,
      stdio: 'inherit'
    });
  }
};

export const packageImage = (imagePath: string) => {
  const imageName = utils.extractImageName(imagePath);
  const boxFilename = `${imageName}.box`;

  const execOpts = { cwd: imagePath, stdio: 'inherit' };
  log('Building vagrant image...');
  execSync('vagrant up', execOpts);
  execSync('vagrant halt', execOpts);

  log('Packaging vagrant image...');
  execSync(
    `vagrant package --base ${imageName} --output ${boxFilename}`,
    execOpts
  );

  return boxFilename;
};

export const build = (imagePath: string) => {
  if (utils.hasAnsibleGalaxy(imagePath)) {
    ansible.galaxyInstall(imagePath);
  }

  cleanup(imagePath);
  const boxFilename = packageImage(imagePath);
  cleanup(imagePath, { box: false });

  return boxFilename;
};
