echo 'Path: '$1
echo 'Port: '$2 

for i in {1..5}
do
	sleep 2
	echo 'Progress = '$i 
done
sleep 2
echo 'Complete'
