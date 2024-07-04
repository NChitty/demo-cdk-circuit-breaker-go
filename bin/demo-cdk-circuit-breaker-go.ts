#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApplicationLayer } from '../lib/application-layer';
import { PersistenceLayer } from '../lib/persistence-layer';

const app = new cdk.App();
const persistenceLayer = new PersistenceLayer(app, 'PersistenceLayer');
new ApplicationLayer(app, 'ApplicationLayer', {
  table: persistenceLayer.dynamoDbTable,
  circuit: 'HelloWorld',
  ttlDuration: '1m',
});
