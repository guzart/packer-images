import { execSync } from 'child_process';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as gulp from 'gulp';
import * as inquirer from 'inquirer';
import * as path from 'path';

import * as utils from './lib/utils';
import * as vagrantCloud from './lib/vagrantCloud';

dotenv.config();

interface Answers {
  action: string;
  imageName: string;
  version?: string;
}

const galaxyInstall = (imagePath: string) => {
  utils.log(chalk.blue('Installing ansible galaxy dependencies...'));
  execSync('ansible-galaxy install --role-file=ansible-galaxy.yml', {
    cwd: imagePath,
    stdio: 'inherit'
  });
};

interface VagrantCleanupOptions {
  box: boolean;
}

const vagrantCleanup = (
  imagePath: string,
  options: VagrantCleanupOptions = { box: true }
) => {
  const imageName = utils.extractImageName(imagePath);

  const cwd = imagePath;
  utils.log(chalk.green('Cleaning up vagrant files...'));
  execSync('vagrant destroy -f', { cwd, stdio: 'inherit' });
  execSync('rm -rf .vagrant', { cwd, stdio: 'inherit' });
  if (options.box) {
    execSync(`[ ! -e ${imageName}.box ] || rm ${imageName}.box`, {
      cwd,
      stdio: 'inherit'
    });
  }
};

const vagrantPackage = (imagePath: string) => {
  const imageName = utils.extractImageName(imagePath);

  const cwd = imagePath;
  utils.log(chalk.green('Building vagrant image...'));
  execSync('vagrant up', { cwd, stdio: 'inherit' });
  execSync('vagrant halt');

  utils.log(chalk.green('Packaging vagrant image...'));
  execSync(`vagrant package --base ${imageName} --output ${imageName}.box `);
};

const vagrantLocalBuild = (imagePath: string) => {
  if (utils.hasAnsibleGalaxy(imagePath)) {
    galaxyInstall(imagePath);
  }

  vagrantCleanup(imagePath);
  vagrantPackage(imagePath);
  vagrantCleanup(imagePath, { box: false });
};

gulp.task('vagrant:local', () => {
  const imagePath = process.env.IMAGE_PATH;
  // TODO: if imagePath is null, ask for the image
  vagrantLocalBuild(imagePath);
  vagrantCloud.upload(imagePath, {
    accessToken: process.env.VAGRANT_CLOUD_TOKEN,
    username: process.env.VAGRANT_CLOUD_USERNAME,
    version: '1.0.0'
  });
});

gulp.task('vagrant:cloud', () => {
  // TODO: if imagePath is null, ask for the image
  const imagePath = process.env.IMAGE_PATH;

  // asks for version and publishing

  // starts with a local build
  vagrantLocalBuild(imagePath);

  // pushes to vagrant cloud,

  // cleans local image
});

gulp.task('default', done => {
  const imagesPath = __dirname + '/images';
  const availableImages = utils.getAvailableImages(imagesPath);

  const questionnaire = inquirer.prompt([
    {
      type: 'list',
      name: 'imageName',
      message: 'Choose an image:',
      choices: availableImages
    },
    {
      type: 'list',
      name: 'action',
      message: 'Choose your action:',
      choices: (answers: Answers) =>
        utils.getImageActions(path.join(imagesPath, answers.imageName))
    },
    {
      type: 'list',
      name: 'version',
      message: 'Choose this image version?',
      choices(answers: Answers) {
        const boxDetails = vagrantCloud.readBox(answers.imageName);
        const currentVersion = boxDetails.current_version.version;
        return [currentVersion];
      },
      when(answers: Answers) {
        return answers.action === utils.VAGRANT_CLOUD_BUILD;
      }
    }
  ]);

  questionnaire.then((answers: Answers) => {
    // process.env.IMAGE_NAME = answers.imageName;
    const imagePath = path.join(imagesPath, answers.imageName);
    if (answers.action === utils.VAGRANT_LOCAL_BUILD) {
      vagrantLocalBuild(imagePath);
    }

    done();
  });
});
