/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable spellcheck/spell-checker */
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { Client } from '@notionhq/client';
import { App } from '@slack/bolt';

interface Body {
  token?: string;
  team_id?: string;
  team_domain?: string;
  service_id?: string;
  channel_id?: string;
  channel_name?: string;
  timestamp?: string;
  user_id?: string;
  user_name?: string;
  text?: string;
  trigger_word?: string;
}
type BodyKey = keyof Body;

const PROPERTIES = {
  TITLE: 'Name',
  CATEGORY: '種別',
  NAME: 'backlog課題 / issue',
  STATUS: 'status',
  SLACK_THREAD: 'Slackスレッド',
  ESTIMATED_COMPLETION_DATE: '完了予定日',
};
const MESSAGE_TEXT_REGEXP =
  /【.+】\s+(.+)\n【.+】\s+(.+)\n【.+】\s+(.+)\n【.+】\s*(.*)/;

const keyVaultName = process.env['KEY_VAULT_NAME'] ?? '';
const KeyVaultUri = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(KeyVaultUri, credential);

const makeBody = (req: HttpRequest) => {
  const bodyElements = req.body.split('&');
  const body: Body = {};
  for (let elem of bodyElements) {
    elem = elem.split('=');
    body[elem[0] as BodyKey] = elem[1];
  }
  body.text = decodeURIComponent(body.text ?? '');
  return body;
};
const makeProperties = async (body: Body, slack: App) => {
  const findPropertyByIndex = (index: number, messageText: string): string => {
    return MESSAGE_TEXT_REGEXP.exec(messageText)?.at(index) ?? '';
  };
  const category: string = findPropertyByIndex(1, body.text ?? '');
  const name: string = findPropertyByIndex(2, body.text ?? '');
  const url: string = findPropertyByIndex(3, body.text ?? '').replace(
    /[<>]/g,
    ''
  );
  const slackThreadUrl = await slack.client.chat
    .getPermalink({
      channel: body.channel_id ?? '',
      message_ts: body.timestamp ?? '',
    })
    .then((value) => value?.permalink ?? '');
  const estimatedCompletionDate: string = findPropertyByIndex(
    4,
    body.text ?? ''
  ).replace(/\//g, '-');

  const properties: any = {
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
    properties[PROPERTIES.ESTIMATED_COMPLETION_DATE] = {
      date: {
        start: estimatedCompletionDate,
      },
    };
  }
  return properties;
};

const createNotionPage = async (
  properties: any,
  notion: Client,
  databaseId: string
): Promise<string> => {
  const notionPage = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: properties,
  });
  return (notionPage as any).url ?? '';
};

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log('HTTP trigger function processed a request.');

  const slackAppToken = await secretClient.getSecret('slackAppToken');
  const slackAppSigningSecret = await secretClient.getSecret(
    'slackAppSigningSecret'
  );
  const notionApiAuthKey = await secretClient.getSecret('notionApiAuthKey');
  const notionDatabaseId = await secretClient.getSecret('notionDatabaseId');
  const slack = new App({
    token: slackAppToken.value,
    signingSecret: slackAppSigningSecret.value,
  });
  const notion = new Client({
    auth: notionApiAuthKey.value,
  });

  const body: Body = makeBody(req);
  context.log('catch the task post: ', body);
  const properties = await makeProperties(body, slack);
  const notionPageUrl = await createNotionPage(
    properties,
    notion,
    notionDatabaseId.value ?? ''
  );
  await slack.client.chat.postMessage({
    channel: body.channel_id ?? '',
    text: `<@${body.user_id ?? ''}> Succeeded in adding a task to <${notionPageUrl}|this NOTION page> !`,
  });
  context.res = {};
};

export default httpTrigger;
