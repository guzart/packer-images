import { execSync } from 'child_process';
import chalk from 'chalk';

import * as utils from './utils';
import * as vagrant from './vagrant';

const log = (...info: any[]) => utils.log(chalk.greenBright(...info));

interface UploadOptions {
  accessToken: string;
  boxName?: string;
  username: string;
  providerName?: 'virtualbox';
  version: string;
}

interface Provider {
  name: string;
  hosted: boolean;
  hosted_token: string | null;
  original_url: string;
  created_at: string;
  updated_at: string;
  download_url: string;
}

interface Version {
  version: string;
  status: 'released' | 'unreleased';
  description_html: string;
  description_markdown: string;
  created_at: string;
  updated_at: string;
  number: string;
  release_url: string;
  revoke_url: string;
  providers: Provider[];
}

interface ReadBoxResponse {
  created_at: string;
  updated_at: string;
  tag: string;
  name: string;
  short_description: string;
  description_html: string;
  username: string;
  description_markdown: string;
  private: boolean;
  current_version?: Version;
  versions: Version[];
}

export const readBox = (
  boxName: string,
  username?: string,
  accessToken?: string
): ReadBoxResponse => {
  log('Fetching details about Vagrant Cloud box...');
  const vagrantAccessToken = accessToken || process.env.VAGRANT_CLOUD_TOKEN;
  const vagrantUsername = username || process.env.VAGRANT_CLOUD_USERNAME;
  const url = `https://app.vagrantup.com/api/v1/box/${vagrantUsername}/${boxName}`;
  const response = execSync(
    `curl --silent --header "Authorization: Bearer ${vagrantAccessToken}" ${url}`
  );
  const responseData = JSON.parse(response.toString());
  return responseData;
};

interface PrepareUploadResponse {
  upload_path: string;
}

export const upload = (imagePath: string, options: UploadOptions) => {
  log('Pushing vagrant image to Vagrant Cloud...');
  const cwd = imagePath;
  const imageName = options.boxName || utils.extractImageName(imagePath);
  const providerName = options.providerName || 'virtualbox';

  const prepareUrl = `https://app.vagrantup.com/api/v1/box/${options.username}/${imageName}/version/${options.version}/provider/${providerName}/upload?access_token=${options.accessToken}`;
  const prepareCmd = `curl --silent ${prepareUrl}`;
  const prepareResponse: PrepareUploadResponse = JSON.parse(
    execSync(prepareCmd, { cwd }).toString()
  );
  execSync(
    `curl -X PUT --upload-file ${imageName}.box ${prepareResponse.upload_path}`,
    { cwd, stdio: 'inherit' }
  );
  log('Upload complete.');
  // TODO: add verification
};

export const releaseVersion = (options: UploadOptions) => {
  const url = `https://app.vagrantup.com/api/v1/box/${options.username}/${options.boxName}/version/${options.version}/release`;
  execSync(
    `curl --request PUT --header "Authorization: Bearer ${options.accessToken}" ${url}`,
    { stdio: 'inherit' }
  );
};

export const build = (imagePath: string, options: UploadOptions) => {
  // vagrant.build(imagePath);
  upload(imagePath, options);
  releaseVersion(options);
  vagrant.cleanup(imagePath);
};
