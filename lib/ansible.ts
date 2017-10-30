import chalk from 'chalk';
import { execSync } from 'child_process';

import * as utils from './utils';

const log = (...info: any[]) => utils.log(chalk.blue(...info));

export const galaxyInstall = (imagePath: string) => {
  log('Installing ansible galaxy dependencies...');
  execSync('ansible-galaxy install --role-file=ansible-galaxy.yml', {
    cwd: imagePath,
    stdio: 'inherit'
  });
};
