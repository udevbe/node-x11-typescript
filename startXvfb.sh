#!/usr/bin/env bash

NOLISTEN=tcp
DISPLAY=:99.0
#  - NOLISTEN=unix DISPLAY=:99.0
#  - NOLISTEN=unix DISPLAY=127.0.0.2:99.0

export XAUTHORITY=/tmp/.Xauthority-Xvfb
xauth add :99 . $(mcookie)
xauth add 127.0.0.2:99 . $(mcookie)
/sbin/start-stop-daemon --start --quiet --pidfile /tmp/custom_xvfb_99.pid --make-pidfile --background --exec /usr/bin/Xvfb -- :99 -nolisten $NOLISTEN -auth $XAUTHORITY
sleep 1
