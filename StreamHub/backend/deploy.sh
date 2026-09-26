#!/bin/bash
docker pull riimuru/consumet-api
docker run -d --name consumet --restart unless-stopped -p 3000:3000 riimuru/consumet-api
