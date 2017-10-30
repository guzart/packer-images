import * as dotenv from 'dotenv';
import * as gulp from 'gulp';
import * as inquirer from 'inquirer';
import * as path from 'path';

import * as digitalOcean from './lib/digitalOcean';
import * as utils from './lib/utils';
import * as vagrant from './lib/vagrant';
import * as vagrantCloud from './lib/vagrantCloud';

dotenv.config();

interface Answers {
  action: string;
  imageName: string;
  version?: string;
}

gulp.task('vagrant:local', () => {
  const imagePath = process.env.IMAGE_PATH;
  // TODO: if imagePath is null, ask for the image
  vagrant.build(imagePath);
});

gulp.task('vagrant:cloud', () => {
  // TODO: if imagePath is null, ask for the image
  const imagePath = process.env.IMAGE_PATH;

  // asks for version and publishing

  vagrantCloud.build(imagePath, {
    accessToken: process.env.VAGRANT_CLOUD_TOKEN,
    username: process.env.VAGRANT_CLOUD_USERNAME,
    version: '1.0.0'
  });
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
        const choices = [];
        let currentVersion = [0, 0, 0];

        const boxDetails = vagrantCloud.readBox(answers.imageName);
        if (boxDetails.versions[0].status === 'unreleased') {
          currentVersion = boxDetails.versions[0].version
            .split('.')
            .map(n => parseInt(n, 10));
          choices.push(`Unreleased version - ${currentVersion.join('.')}`);
        }

        choices.push(
          `Next patch - ${[
            currentVersion[0],
            currentVersion[1],
            currentVersion[2] + 1
          ].join('.')}`
        );

        choices.push(
          `Next minor - ${[
            currentVersion[0],
            currentVersion[1] + 1,
            currentVersion[2]
          ].join('.')}`
        );

        choices.push(
          `Next major - ${[
            currentVersion[0] + 1,
            currentVersion[1],
            currentVersion[2]
          ].join('.')}`
        );

        return choices;
      },
      when(answers: Answers) {
        return answers.action === utils.VAGRANT_CLOUD_BUILD;
      }
    }
  ]);

  questionnaire.then((answers: Answers) => {
    // process.env.IMAGE_NAME = answers.imageName;
    const { action, imageName } = answers;
    const imagePath = path.join(imagesPath, imageName);

    switch (action) {
      case utils.DIGITAL_OCEAN_BUILD:
        digitalOcean.build(imagePath);
        break;

      case utils.VAGRANT_LOCAL_BUILD:
        vagrant.build(imagePath);
        break;

      case utils.VAGRANT_CLOUD_BUILD:
        const version = answers.version.replace(/.*(\d+\.\d+\.\d+)/, '$1');
        vagrantCloud.build(imagePath, {
          accessToken: process.env.VAGRANT_CLOUD_TOKEN,
          username: process.env.VAGRANT_CLOUD_USERNAME,
          version
        });
        break;
    }

    done();
  });
});
