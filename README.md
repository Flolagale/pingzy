#Pingzy

__Ultra cheap website monitoring. Posts downtime notifications to Slack.__

15 seconds setup:
```
sudo npm install -g pingzy
```

```
pingzy -h

  Usage: pingzy [options]

  Options:

    -h, --help                               output usage information
    -V, --version                            output the version number
    -u, --urls <items>                       The urls to monitor separated by commas without spaces. (http://mysite.com,https://my.othersite.com)
    -d, --slack-domain [Slack domain]        Your Slack domain as in http://domain.slack.com.
    -t, --slack-url [Slack webhook url]      The Slack webhook url of your webhook integration.
    -c, --slack-channel [Slack channel]      The Slack channel to post to. Default to #general.
    -i, --interval <n>                       The interval in minutes between each check of the urls. Default to 1 minute.
    -l, --log-file [file path]               The log file path. Default to './.tmp/pingzy.log'.
    --verbose                                Set the logging level to verbose.

```

Example usage:
```
pingzy --urls http://jokund.com,http://mailin.io --slack-domain flabs  --slack-url https://hooks.slack.com/services/******/******/********* --slack-channel dev
```

## Docker

Build and run

```bash
docker build -t pingzy .
docker run -e URLS=http://jokund.com,http://mailin.io -e SLACK_DOMAIN=flabs -e SLACK_URL=https://hooks.slack.com/services/******/******/********* -e SLACK_CHANNEL=dev
```

### Using docker-compose

1. Edit docker-compose.yml file
2. `docker-compose up`
