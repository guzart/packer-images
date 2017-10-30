// import { execSync } from 'child_process';
import chalk from 'chalk';

import * as utils from './utils';

const log = (...info: any[]) => utils.log(chalk.blueBright(...info));

export const build = (_: string) => {
  log('Building DigitalOcean snapshot...');
};
