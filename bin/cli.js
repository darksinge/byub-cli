#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { CLOUDFORMATION_SCHEMA } = require('js-yaml-cloudformation-schema')
const eventBase = require('../templates/AWSEvent.template.json')

const generateJSONSchemaTemplate = (event) => {
  const template = { ...eventBase }
  template.components.schemas.AWSEvent.properties.detail.$ref = `#/components/schemas/${event}`
  template.components.schemas[event] = {
    type: 'object',
    required: [],
    properties: {
      id: {
        type: 'string'
      }
    }
  }

  return template
}

const toJSONTemplate = (argv) => {
  const template = generateJSONSchemaTemplate(argv.event)
  const fout = argv.output ?? `${argv.event}.json`
  fs.writeFileSync(fout, JSON.stringify(template, null, 2))
}

const toServerlessJsTemplate = (argv) => {
  const template = yaml.load(fs.readFileSync(path.join(__dirname, '..', 'templates/serverlessjs.template.yml')), {
    schema: CLOUDFORMATION_SCHEMA
  })

  const eventSchema = generateJSONSchemaTemplate(argv.event)

  const event = `${argv.event.charAt(0).toUpperCase()}${argv.event.slice(1)}`

  template.Resources.__PLACEHOLDER__EventSchema.Properties.Content = JSON.stringify(eventSchema, null, 2)

  const fout = argv.output ?? `${event}.yml`

  const data = yaml.dump(template).replace(/__PLACEHOLDER__/g, event)
  console.log(data)
  fs.writeFileSync(fout, data)
}

// eslint-disable-next-line no-unused-expressions
require('yargs/yargs')(process.argv.slice(2))
  .option('output', {
    alias: 'o',
    desc: 'Filename of output. Defaults to "<event>.json".',
    type: 'string'
  })
  .option('template', {
    alias: 't',
    desc: 'The template used to generate the event schema.',
    choices: ['json', 'serverlessjs'],
    default: 'json'
  })
  .command({
    command: 'create-event-schema <event>',
    desc: 'Generate an event schema from template',
    builder: yargs => yargs
      .positional('event', {
        describe: 'The name of the event',
        type: 'string'
      })
      .alias('output', 'o')
      .default('template', 'json'),
    handler: argv => {
      if (argv.template === 'serverlessjs') {
        toServerlessJsTemplate(argv)
      } else {
        toJSONTemplate(argv)
      }
    }
  })
  .example('$0 create-event-schema UserSignedUpEvent --output=event.yml --template=serverlessjs')
  .example('$0 create-event-schema UserSignedUpEvent --output=event.json --template=json')
  .wrap(100)
  .demandCommand()
  .help()
  .argv
