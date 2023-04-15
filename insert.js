import {DeepClient} from "@deep-foundation/deeplinks/imports/client.js";
import {readFile} from "fs/promises";
import {generateApolloClient} from "@deep-foundation/hasura/client.js";
import dotenv from 'dotenv';
dotenv.config();


async function createDeepClient() {
    const apolloClient = generateApolloClient({
        path: process.env.NEXT_PUBLIC_GQL_PATH || '',
        ssl: !~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost'),
    });

    const unloginedDeep = new DeepClient({apolloClient});
    const guest = await unloginedDeep.guest();
    const guestDeep = new DeepClient({deep: unloginedDeep, ...guest});
    const admin = await guestDeep.login({
        linkId: await guestDeep.id('deep', 'admin'),
    });
    return new DeepClient({deep: guestDeep, ...admin})
}


async function insertLinksFromFile(filename) {

    let deep  = await createDeepClient

    try {
        const data = await readFile(filename, 'utf8');
        const linksData = JSON.parse(data);
        const links = [];
        const objects = [];
        const numbers = [];
        const strings = [];

        for (let i = 0; i < linksData.length; i++) {
            const link = linksData[i];
            links.push({
                id: link.id,
                from_id: link.from_id,
                to_id: link.to_id,
                type_id: link.type_id
            });

            if (link.string) {
                strings.push(link.string);
            }

            if (link.number) {
                numbers.push(link.number);
            }

            if (link.object) {
                objects.push(link.object);
            }
        }

        await deep.serial({
            operations: [
                {
                    table: 'links',
                    type: 'insert',
                    objects: links
                },
                {
                    table: 'objects',
                    type: 'insert',
                    objects: objects
                },
                {
                    table: 'numbers',
                    type: 'insert',
                    objects: numbers
                },
                {
                    table: 'strings',
                    type: 'insert',
                    objects: strings
                }
            ]
        });

        console.log('Data inserted successfully');
    } catch (error) {
        console.error(error);
    }
}

export {insertLinksFromFile}