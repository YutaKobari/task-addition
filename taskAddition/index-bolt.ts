// こちらはboltを使用した常駐プロセス（httpサーバー）でVM運用の想定で作ったもの。azure functionsでの実装に変更したため、こちらは使わないが残しておく。なお、クレデンシャル情報などは消しているので、このままでは動かない。
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable spellcheck/spell-checker */
import { Client } from '@notionhq/client';
import { App } from '@slack/bolt';

const app = new App({
  token: '',
  signingSecret: '',
});

const messageTextRegexp =
  /【.+】\s+(.+)\n【.+】\s+(.+)\n【.+】\s+(.+)\n【.+】\s*(.*)/;

const PROPERTIES = {
  TITLE: 'Name',
  CATEGORY: '種別',
  NAME: 'backlog課題 / issue',
  STATUS: 'status',
  SLACK_THREAD: 'Slackスレッド',
  ESTIMATED_COMPLETION_DATE: '完了予定日',
};

const findPropertyByIndex = (
  index: number,
  messageText: string
): string => {
  return messageTextRegexp.exec(messageText)?.at(index) ?? '';
};

app.message(messageTextRegexp, async ({ message, say }) => {
  console.log('catch the task post: ', message);
  if (!message.subtype) {
    const taskCategory: string = findPropertyByIndex(1, message.text ?? '');
    const taskName: string = findPropertyByIndex(2, message.text ?? '');
    const taskUrl: string = findPropertyByIndex(3, message.text ?? '');
    const taskSlackThreadUrl = await app.client.chat
      .getPermalink({
        channel: message.channel,
        message_ts: message.ts,
      })
      .then((value) => value?.permalink ?? '');

    const taskEstimatedCompletionDate: string = findPropertyByIndex(
      4,
      message.text ?? ''
    ).replace(/\//g, '-');
    const propertiesOfTask = makeProperties(
      taskCategory,
      taskName,
      taskUrl,
      taskEstimatedCompletionDate,
      taskSlackThreadUrl
    );
    await exec(propertiesOfTask);
    await say(
      `<@${message.user}> Succeeded in adding a task to NOTION ! ${taskCategory}${taskName}${taskUrl}${taskEstimatedCompletionDate}${taskSlackThreadUrl}`
    );
  }
});

void (async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Task Addition To NOTION is running!');
})();

const notion = new Client({
  auth: '',
});

const makeProperties = (
  category: string,
  name: string,
  url: string,
  estimatedCompletionDate: string,
  slackThreadUrl: string
) => {
  const propertiesOfTask: any = {
    [PROPERTIES.TITLE]: {
      title: [
        {
          text: {
            content: category,
          },
        },
      ],
    },
    [PROPERTIES.CATEGORY]: {
      select: {
        name: category,
      },
    },
    [PROPERTIES.NAME]: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: name,
            link: {
              url: url,
            },
          },
        },
      ],
    },
    [PROPERTIES.STATUS]: {
      select: {
        name: '未着手',
      },
    },
    [PROPERTIES.SLACK_THREAD]: {
      url: slackThreadUrl,
    },
  };

  if (/\d{4}-\d{2}-\d{2}/.test(estimatedCompletionDate)) {
    propertiesOfTask[PROPERTIES.ESTIMATED_COMPLETION_DATE] = {
      date: {
        start: estimatedCompletionDate,
      },
    };
  }

  return propertiesOfTask;
};

const exec = async (properties: any): Promise<void> => {
  await notion.pages.create({
    parent: {
      database_id: '',
    },
    properties: properties,
  });
};
