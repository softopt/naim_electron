This is the tutorial on:

https://www.twilio.com/blog/an-introduction-to-building-desktop-applications-with-electron

Notes:

1. 'npm init -y'

Creates a new npm package and -y just means assume 'y' for all questions

It creates the default 'package.json' for the applications-with-electron

2. 'npm install --save-dev electron

3. Add 'click event'

This didn't work for me. After taking some time debugging the index.html in Chrome I worked out that:
a) The script was being called but throwing at the request for the 'getElementById' because it returned null ("addTask" does not exist)
b) As the script is installing a 'click' event handler, this is a problem. 
c) The form elements are not added until the <body> is run so won't be available in <head> (where script is references and first run)
d) Move the <script> element to after the form elements created and all is OK

