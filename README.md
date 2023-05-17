# Deep Export-Import Tool

This tool provides CLI commands for loading and saving data via a GraphQL interface.

## Installation

To install this tool, use the following command:

```bash
npm install -g deep-import-and-export
```
Usage
This tool provides two commands: deep-export and deep-import.

## deep-export
The deep-export command is used to load data from the specified URL and save it to a file.

Usage example:
```bash
deep-export --url "https://your-url/gql" --jwt "your-jwt-token" --file "dump.json"
```
Parameters:

--url: The URL from which data will be loaded. (required)
--jwt: The JWT token for authentication. (required)
--file: The name of the file to which data will be saved. (not required)

## deep-import
The deep-import command is used to load data from a file and save it to the specified URL.

Usage example:
```bash
deep-import --url "https://your-url/gql" --jwt "your-jwt-token" --file "dump.json"
```
Parameters:

--url: The URL to which data will be uploaded. (required)
--jwt: The JWT token for authentication. (required)
--file: The name of the file from which data will be loaded. (required)