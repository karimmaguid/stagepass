<?php
$allowedExts = array("gif", "jpeg", "jpg", "png");
$temp = explode(".", $_FILES["file"]["name"]);
$extension = end($temp);
$guid = guid();
if (in_array($extension, $allowedExts)){
  if ($_FILES["file"]["error"] > 0) {
    echo "Return Code: " . $_FILES["file"]["error"] . "<br>";
  } else {
      move_uploaded_file($_FILES["file"]["tmp_name"],
      "userimages/" . $guid . $_FILES["file"]["name"]);
      echo  "userimages/" . $guid . $_FILES["file"]["name"];
  }
} else {
  echo "Invalid file";
}

function guid(){
 
            mt_srand((double)microtime()*10000);
            $charid = strtoupper(md5(uniqid(rand(), true)));
            $hyphen = "_";
            $uuid = ""
                    .substr($charid, 0, 8).$hyphen
                    .substr($charid, 8, 4).$hyphen;
                    
                                return $uuid;
        
    }
?>
