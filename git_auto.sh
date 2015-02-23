git add . -A

echo 'Enter the commit message:'
read commitMessage
git commit -m "$commitMessage"

git log \
	--date=short \
    --pretty='format:{%n  "commit": "%h",%n  "author": "%an <%ae>",%n  "date": "%cd",%n  "message": "%s"%n},' \
    $@ | \
    perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
    perl -pe 's/},]/}]/' > ./pub/data/logs.json
    
git commit --amend --no-edit

#git log --date=short --pretty='format:%h %s%n\t%cd, %an <%ae>'