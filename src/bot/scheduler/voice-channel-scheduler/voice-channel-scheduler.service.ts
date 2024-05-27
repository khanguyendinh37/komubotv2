import { Injectable, Logger } from "@nestjs/common";
import { InjectDiscordClient } from "@discord-nestjs/core";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { ChannelType, Client } from "discord.js";
import { CronJob } from "cron";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TimeVoiceAlone } from "src/bot/models/timeVoiceAlone.entity";
import { VoiceChannels } from "src/bot/models/voiceChannel.entity";
import { UtilsService } from "src/bot/utils/utils.service";
import { JoinCall } from "src/bot/models/joinCall.entity";
import { AudioPlayer } from "src/bot/utils/audioPlayer.utils";
import { ClientConfigService } from "src/bot/config/client-config.service";

@Injectable()
export class VoiceChannelSchedulerService {
  constructor(
    private utilsService: UtilsService,
    @InjectRepository(TimeVoiceAlone)
    private timeVoiceAloneRepository: Repository<TimeVoiceAlone>,
    @InjectRepository(JoinCall)
    private joinCallRepository: Repository<JoinCall>,
    @InjectRepository(VoiceChannels)
    private voiceChannelRepository: Repository<VoiceChannels>,
    private schedulerRegistry: SchedulerRegistry,
    @InjectDiscordClient()
    private client: Client,
    private configClient: ClientConfigService,
    private audioPlayerService: AudioPlayer
  ) {}

  private readonly logger = new Logger(VoiceChannelSchedulerService.name);

  addCronJob(name: string, time: string, callback: () => void): void {
    const job = new CronJob(
      time,
      () => {
        this.logger.warn(`time (${time}) for job ${name} to run!`);
        callback();
      },
      null,
      true,
      "Asia/Ho_Chi_Minh"
    );

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.warn(`job ${name} added for each minute at ${time} seconds!`);
  }

  // Start cron job
  startCronJobs(): void {
    this.addCronJob("kickMemberVoiceChannel", CronExpression.EVERY_MINUTE, () =>
      this.kickMemberVoiceChannel(this.client)
    );
    this.addCronJob("audioPlayer", "30 11 * * 5", () =>
      this.audioPlayerService.audioPlayer(this.client, null, null)
    );
    this.addCronJob("renameVoiceChannel", "23 00 * * 0-6", () =>
      this.renameVoiceChannel(this.client)
    );
    this.addCronJob("turnOffBot", "15 14 * * 4", () =>
      this.turnOffBot(this.client)
    );
    this.addCronJob("checkJoinCall", "0 9-11,13-17 * * 1-5", () =>
      this.checkJoinCall(this.client)
    );
  }

  async kickMemberVoiceChannel(client) {
    if (await this.utilsService.checkHoliday()) return;
    let guild = client.guilds.fetch(this.configClient.guild_komu_id);
    const getAllVoice = client.channels.cache.filter(
      (guild) =>
        guild.type === ChannelType.GuildVoice &&
        guild.parentId === this.configClient.guildvoice_parent_id
    );
    const voiceChannel = getAllVoice.map((item) => item.id);

    const timeNow = Date.now();
    let roomMap = [];
    let voiceNow = [];

    const timeVoiceAlone = await this.timeVoiceAloneRepository
      .createQueryBuilder()
      .where('"status" IS NOT True')
      .select("*")
      .execute();

    const tenMinutes = 600000;
    timeVoiceAlone.map(async (item) => {
      voiceNow.push(item.channelId);
      if (timeNow - item.start_time >= tenMinutes) {
        const fetchVoiceNcc8 = await client.channels.fetch(item.channelId);

        if(!fetchVoiceNcc8) {
          return;
        }

        if (fetchVoiceNcc8.members.first) {
          const target = fetchVoiceNcc8.members.first();
          if (target && target.voice)
            target.voice.disconnect().catch(console.error);
        }

        await this.timeVoiceAloneRepository.update(
          { channelId: item.channelId },
          { status: true }
        );
      }
    });

    voiceChannel.map(async (voice, index) => {
      const userDiscord = await client.channels.fetch(voice);
      if (userDiscord.members.size === 0 || userDiscord.members.size > 1) {
        await this.timeVoiceAloneRepository.update(
          { channelId: voice },
          { status: true }
        );
      }

      if (userDiscord.members.size === 1) {
        roomMap.push(userDiscord.id);
      }

      let roomVoice = roomMap.filter((room) => !voiceNow.includes(room));

      if (index === voiceChannel.length - 1) {
        roomVoice.map(async (item) => {
          await this.timeVoiceAloneRepository
            .insert({
              channelId: item,
              status: false,
              start_time: timeNow,
            })
            .catch((err) => console.log(err));
        });
      }
    });
  }

  async renameVoiceChannel(client) {
    try {
      const findVoice = await this.voiceChannelRepository
        .createQueryBuilder()
        .where('"status" = :status', { status: "start" })
        .andWhere('"createdTimestamp" >= :gtecreatedTimestamp', {
          gtecreatedTimestamp: this.utilsService.getYesterdayDate(),
        })
        .andWhere('"createdTimestamp" <= :ltecreatedTimestamp', {
          ltecreatedTimestamp: this.utilsService.getTomorrowDate(),
        })
        .select("*")
        .execute();

      findVoice.map(async (item) => {
        const channelName = await client.channels.fetch(item.voiceChannelId);
        await channelName.setName(`${item.originalName}`);
        await this.voiceChannelRepository.update(
          { id: item.id },
          { status: "finished" }
        );
      });
    } catch (error) {
      console.log(error);
    }
  }

  async turnOffBot(client) {
    const fetchVoiceNcc8 = await client.channels.fetch(
      this.configClient.ncc8Voice
    );
    const target = await fetchVoiceNcc8.guild.members.fetch(
      this.configClient.guild_komu_id
    );
    target.voice.disconnect().catch(console.error);
  }

  async checkJoinCall(client) {
    if (await this.utilsService.checkHoliday()) return;
    const now = new Date();
    const millisecondsOfTwoHours = 1000 * 60 * 60 * 2;
    const beforeHours = new Date(now.getTime() - millisecondsOfTwoHours);

    await this.joinCallRepository
      .createQueryBuilder()
      .update(JoinCall)
      .set({ status: "finish", end_time: Date.now() })
      .where('"status" = :status', { status: "joining" })
      .andWhere(`"start_time" >= :gtestart_time`, {
        gtestart_time: beforeHours.getTime(),
      })
      .execute()
      .catch(console.error);
  }
}
