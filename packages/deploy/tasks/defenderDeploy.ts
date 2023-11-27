import {task} from 'hardhat/config';
import 'dotenv/config';
import 'hardhat-deploy';
import {HardhatPluginError} from 'hardhat/plugins';
import {Defender} from '@openzeppelin/defender-sdk';

task('defender', 'use defender admin to propose transactions').setAction(
  async () => {
    if (!process.env.DEFENDER_KEY || !process.env.DEFENDER_SECRET) {
      throw new HardhatPluginError(
        'you must configure DEFENDER_API_SECRET and DEFENDER_API_KEY in .env'
      );
    }
    const client = new Defender({
      apiKey: process.env.DEFENDER_KEY,
      apiSecret: process.env.DEFENDER_SECRET,
    });
    const deployClient = client.deploy;
    const l = await deployClient.listDeployments();
    console.log(l);
  }
);
