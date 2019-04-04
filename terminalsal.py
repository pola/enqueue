import commands

name = 'sport'
m = 13
room_id = '4'

for i in range(1, m + 1):
	i = str(i).zfill(2)
	ip = commands.getoutput("nslookup " + name + "-" + i + ".csc.kth.se | grep 'Address' | grep -v '#' | sed -r 's/Address: //'")
	print("INSERT INTO `computers` (`name`, `ip`, `room_id`) VALUES('" + name + " " + i + "', '" + ip + "', " + room_id + ");")
