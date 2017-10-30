import { execSync } from 'child_process';
import chalk from 'chalk';

import * as utils from './utils';

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
  status: string;
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
}

const log = (...info: any[]) => utils.log(chalk.green(...info));

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

  const prepareUrl = `https://vagrantcloud.com/api/v1/box/${options.username}/${imageName}/version/${options.version}/provider/${providerName}/upload?access_token=${options.accessToken}`;
  const prepareResponse: PrepareUploadResponse = JSON.parse(
    execSync(`curl --silent ${prepareUrl}`, { cwd }).toString()
  );
  execSync(
    `curl -X PUT --upload-file ${imageName}.box ${prepareResponse.upload_path}`,
    { cwd, stdio: 'inherit' }
  );
  // TODO: add verification
};
