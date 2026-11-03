package com.handsfree.mobile;
import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.widget.Toast;
/** Uses supported print and single-document selection; no broad storage grant. */
final class ImprovementPdf {
 private static final int PICK_PDF=4104;
 void export(Activity activity,WebView view,boolean share){
  try{
   if(!share){((PrintManager)activity.getSystemService(Activity.PRINT_SERVICE)).print("KMT 개선제안서",view.createPrintDocumentAdapter("KMT 개선제안서"),new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());return;}
   activity.startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/pdf").addCategory(Intent.CATEGORY_OPENABLE),PICK_PDF);
  }catch(Exception e){Toast.makeText(activity,"PDF 저장·선택 화면을 열지 못했습니다.",Toast.LENGTH_LONG).show();}
 }
 boolean result(Activity activity,int request,int result,Intent data){
  if(request!=PICK_PDF)return false;
  Uri uri=result==Activity.RESULT_OK&&data!=null?data.getData():null;
  if(uri==null||!"content".equals(uri.getScheme()))return true;
  Intent send=new Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM,uri);
  send.setClipData(ClipData.newRawUri("KMT 개선제안서",uri));send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
  try{activity.startActivity(Intent.createChooser(send,"개선제안서 공유"));}catch(Exception e){Toast.makeText(activity,"공유할 앱을 열지 못했습니다.",Toast.LENGTH_LONG).show();}
  return true;
 }
}
