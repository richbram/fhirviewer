#!/bin/sh
OUTFILE=/home/node/build/env_config.js
set -e
# Set up endpoint for env retrieval
echo "window._env_ = {" > ${OUTFILE}
# Collect enviroment variables for react
echo "Environment variables:"
echo "$(env | grep BCNC_.*=)"
# Loop over variables
env | grep BCNC_.*= | while read -r line; 
do
    if echo $line | grep '=${';
    then
        eval line=$line
    fi
    printf "%s',\n" $line | sed "s/=/:'/" >> ${OUTFILE}
    # Notify the user
    printf "Env variable '%s' was injected into React App. \n" $line | sed "0,/=/{s//:'/}"
done
# End the object creation
echo "}" >> ${OUTFILE}
echo "Enviroment Variable Injection Complete."
# exec the CMD from the Dockerfile
exec "$@"