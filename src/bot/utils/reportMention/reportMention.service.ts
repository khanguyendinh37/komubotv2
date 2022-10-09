import { InjectRepository } from "@nestjs/typeorm";
import { WorkFromHome } from "src/bot/models/wfh.entity";
import { Repository } from "typeorm";
import { UtilsService } from "../utils.service";
import { Injectable } from "@nestjs/common";
import { EmbedBuilder } from "discord.js";
import { KomubotrestService } from "../komubotrest/komubotrest.service";

@Injectable()
export class ReportMentionService {
  constructor(
    @InjectRepository(WorkFromHome)
    private wfhRepository: Repository<WorkFromHome>,
    private komubotrestService: KomubotrestService,
    private utilsService: UtilsService
  ) {}

  async reportMention(message, client) {
    const authorId = message.author.id;
    const mentionFullday = await this.wfhRepository
      .createQueryBuilder("wfh")
      .where('"wfh.type" = :type', { type: "wfh" })
      .andWhere(
        `"wfh.createdAt" > ${this.utilsService.getTimeToDayMention().firstDay}`
      )
      .andWhere(
        `"wfh.createdAt" < ${this.utilsService.getTimeToDayMention().lastDay}`
      )
      .orWhere('"wfh.status" = :status', { status: "ACCEPT" })
      .orWhere('"wfh.status" = :status', { status: "ACTIVE" })
      .orWhere('"wfh.status" = :status', {
        status: "APPROVED",
        pmconfirm: false,
      })
      .groupBy("wfh.userId")
      .having("count(1) = :number", { number: 1 })
      .orderBy("COUNT(wfh.userId)", "DESC")
      .leftJoinAndSelect("wfh.userId", "users")
      .execute();
      
    let mess;
    if (!mentionFullday) {
      return;
    } else if (Array.isArray(mentionFullday) && mentionFullday.length === 0) {
      mess = "```" + "Không có ai vi phạm trong ngày" + "```";
      return message.reply(mess).catch((err) => {
        this.komubotrestService.sendErrorToDevTest(client, authorId, err);
      });
    } else {
      for (let i = 0; i <= Math.ceil(mentionFullday.length / 50); i += 1) {
        if (mentionFullday.slice(i * 50, (i + 1) * 50).length === 0) break;
        mess = mentionFullday
          .slice(i * 50, (i + 1) * 50)
          .map((mention) => `${mention.username} (${mention.total})`)
          .join("\n");
        const Embed = new EmbedBuilder()
          .setTitle("Những người không trả lời mention trong ngày hôm nay")
          .setColor("Red")
          .setDescription(`${mess}`);
        await message.reply({ embeds: [Embed] }).catch((err) => {
          this.komubotrestService.sendErrorToDevTest(client, authorId, err);
        });
      }
    }
  }
}
